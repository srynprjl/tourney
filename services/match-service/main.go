package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"log/slog"
	"math/rand"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Tournament struct {
	ID                uuid.UUID `json:"id"`
	Type              string    `json:"type"`
	Sport             string    `json:"sport"`
	IsDouble          bool      `json:"is_double"`
	SimulationEnabled bool      `json:"simulation_enabled"`
}

type Match struct {
	ID           uuid.UUID    `gorm:"type:uuid;primaryKey" json:"id"`
	TournamentID uuid.UUID    `gorm:"type:uuid;not null;index" json:"tournament_id"`
	Team1ID      uuid.UUID    `gorm:"type:uuid" json:"team1_id"`
	Team2ID      uuid.UUID    `gorm:"type:uuid" json:"team2_id"`
	Team1Score   int          `json:"team1_score"`
	Team2Score   int          `json:"team2_score"`
	Round        int          `json:"round"`
	Stage        int          `gorm:"default:0" json:"stage"`
	GroupName    string       `json:"group_name"`
	IsPlayed     bool         `gorm:"default:false" json:"is_played"`
	Status       string       `gorm:"default:scheduled" json:"status"` // "scheduled", "live", "completed"
	CurrentTime  int          `json:"current_time"`                    // In seconds
	Events       []MatchEvent `gorm:"constraint:OnDelete:CASCADE;" json:"events"`
	NextMatchID  *uuid.UUID   `gorm:"type:uuid" json:"next_match_id"`
	LoserNextMatchID *uuid.UUID `gorm:"type:uuid" json:"loser_next_match_id"`
	TieID        *uuid.UUID   `gorm:"type:uuid" json:"tie_id"`
	WinnerID     *uuid.UUID   `gorm:"type:uuid" json:"winner_id"`
	Position     int          `gorm:"default:0" json:"position"`
	LoserPosition int         `gorm:"default:0" json:"loser_position"`
}

type MatchEvent struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	MatchID    uuid.UUID `gorm:"type:uuid;not null;index" json:"match_id"`
	Type       string    `json:"type"` // "goal", "card_yellow", "card_red", "wicket", "run", "point_1", "point_2", "point_3"
	TeamID     uuid.UUID `gorm:"type:uuid" json:"team_id"`
	PlayerID   uint      `json:"player_id"`
	PlayerName string    `json:"player_name"`
	Value      int       `json:"value"`  // e.g., runs in cricket
	Minute     int       `json:"minute"` // or ball number in cricket
	CreatedAt  time.Time `json:"created_at"`
}

var (
	db        *gorm.DB
	rdb       *redis.Client
	sqsClient *sqs.Client
	queueURL  string
	ctx       = context.Background()
	logger    *slog.Logger
)

const (
	taskQueue = "match_tasks"
)

func setupLogger() {
	if err := os.MkdirAll("logs", 0755); err != nil {
		log.Fatalf("failed to create log directory: %v", err)
	}

	logFile, err := os.OpenFile("logs/match-service.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("failed to open log file: %v", err)
	}

	multiWriter := io.MultiWriter(os.Stdout, logFile)
	logger = slog.New(slog.NewJSONHandler(multiWriter, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)
}

func initDB() {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://user:password@db-match:5432/match_db?sslmode=disable"
	}

	var err error
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dbURL), &gorm.Config{})
		if err == nil {
			break
		}
		logger.Warn("Failed to connect to match database", "attempt", i+1, "error", err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		logger.Error("Could not connect to match database after retries", "error", err)
		os.Exit(1)
	}

	db.AutoMigrate(&Match{}, &MatchEvent{})
}

func initRedis() {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}
	rdb = redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	// Test connection
	for i := 0; i < 5; i++ {
		err := rdb.Ping(ctx).Err()
		if err == nil {
			logger.Info("Connected to Redis")
			return
		}
		logger.Warn("Failed to connect to Redis", "attempt", i+1, "error", err)
		time.Sleep(2 * time.Second)
	}
}

func initSQS() {
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "us-east-1"
	}
	endpoint := os.Getenv("SQS_ENDPOINT")
	accessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	secretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	)
	if err != nil {
		logger.Error("Unable to load AWS SDK config", "error", err)
		os.Exit(1)
	}

	sqsClient = sqs.NewFromConfig(cfg, func(o *sqs.Options) {
		if endpoint != "" {
			o.BaseEndpoint = aws.String(endpoint)
		}
	})

	for i := 0; i < 30; i++ {
		// Auto-create queue if it doesn't exist
		out, cerr := sqsClient.CreateQueue(ctx, &sqs.CreateQueueInput{
			QueueName: aws.String(taskQueue),
		})
		if cerr == nil {
			queueURL = *out.QueueUrl
			logger.Info("SQS initialized", "queue_url", queueURL)
			return
		}

		// If it already exists, get the URL
		gurl, gerr := sqsClient.GetQueueUrl(ctx, &sqs.GetQueueUrlInput{
			QueueName: aws.String(taskQueue),
		})
		if gerr == nil {
			queueURL = *gurl.QueueUrl
			logger.Info("SQS initialized", "queue_url", queueURL)
			return
		}

		err = cerr // keep track of the creation error
		logger.Warn("Failed to connect to SQS or create queue", "attempt", i+1, "error", cerr, "gerr", gerr)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		logger.Error("Could not initialize SQS after retries", "error", err)
		os.Exit(1)
	}
}

func startTaskWorker() {
	logger.Info("Starting background task worker (SQS)")
	for {
		msgOutput, err := sqsClient.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
			QueueUrl:            aws.String(queueURL),
			MaxNumberOfMessages: 1,
			WaitTimeSeconds:     20,
		})
		if err != nil {
			logger.Error("Error receiving message from SQS", "error", err)
			time.Sleep(1 * time.Second)
			continue
		}

		if len(msgOutput.Messages) == 0 {
			continue
		}

		msg := msgOutput.Messages[0]
		taskData := *msg.Body
		logger.Info("Processing background task", "task_data", taskData)

		var task struct {
			Type    string `json:"type"`
			Payload any    `json:"payload"`
		}
		if err := json.Unmarshal([]byte(taskData), &task); err == nil {
			if task.Type == "BULK_SIMULATE" {
				payload := task.Payload.(map[string]any)
				tid := payload["tournament_id"].(string)
				authHeader := payload["auth_token"].(string)
				stage := payload["stage"].(string)
				round := payload["round"].(string)

				var matches []Match
				query := db.Where("tournament_id = ? AND is_played = false", tid)
				if stage != "" {
					query = query.Where("stage = ?", stage)
				}
				if round != "" {
					query = query.Where("round = ?", round)
				}
				query.Find(&matches)

				if len(matches) > 0 {
					// Fetch tournament context once
					tourneyURL := os.Getenv("TOURNAMENT_SERVICE_URL")
					if tourneyURL == "" {
						tourneyURL = "http://tournament-service:8082"
					}
					tReq, _ := http.NewRequest("GET", tourneyURL+"/"+tid, nil)
					tReq.Header.Set("Authorization", authHeader)
					tResp, err := (&http.Client{}).Do(tReq)

					var tournament Tournament
					if err == nil {
						defer tResp.Body.Close()
						json.NewDecoder(tResp.Body).Decode(&tournament)
					}

					for i := range matches {
						performSimulation(&matches[i], tournament)
						rdb.Del(ctx, fmt.Sprintf("match:%s", matches[i].ID.String()))
					}
					rdb.Del(ctx, fmt.Sprintf("tournament:%s:matches", tid))
					broadcastUpdate(tid, "match_update", "bulk_simulated")
					logger.Info("Async bulk simulation completed", "count", len(matches), "tournament_id", tid)
				}
			}
		}

		// Store in completed tasks history in Redis (keep last 50)
		rdb.LPush(ctx, taskQueue+":completed", taskData)
		rdb.LTrim(ctx, taskQueue+":completed", 0, 49)

		// Delete message from SQS
		_, err = sqsClient.DeleteMessage(ctx, &sqs.DeleteMessageInput{
			QueueUrl:      aws.String(queueURL),
			ReceiptHandle: msg.ReceiptHandle,
		})
		if err != nil {
			logger.Error("Failed to delete message from SQS", "error", err)
		}

		logger.Info("Background task completed", "task_data", taskData)
	}
}

func publishMatchCompleted(match Match) {
	winnerID := ""
	if match.WinnerID != nil {
		winnerID = match.WinnerID.String()
	}

	payload := map[string]any{
		"match_id":      match.ID.String(),
		"tournament_id": match.TournamentID.String(),
		"team1_id":      match.Team1ID.String(),
		"team2_id":      match.Team2ID.String(),
		"team1_score":   match.Team1Score,
		"team2_score":   match.Team2Score,
		"winner_id":     winnerID,
		"stage":         match.Stage,
	}

	// Publish to profile-service's task queue for Elo updates
	publishToExternalQueue("profile_tasks", "MATCH_COMPLETED", payload)

	rdb.Publish(ctx, "global_activity", fmt.Sprintf("Match result finalized: %d - %d", match.Team1Score, match.Team2Score))
}

func publishToExternalQueue(qName, taskType string, payload any) error {
	data, _ := json.Marshal(map[string]any{
		"type":    taskType,
		"payload": payload,
		"time":    time.Now().Format(time.RFC3339),
	})

	// Get external queue URL
	out, err := sqsClient.GetQueueUrl(ctx, &sqs.GetQueueUrlInput{
		QueueName: aws.String(qName),
	})
	if err != nil {
		logger.Error("Failed to get external queue URL", "queue", qName, "error", err)
		return err
	}

	_, err = sqsClient.SendMessage(ctx, &sqs.SendMessageInput{
		QueueUrl:    out.QueueUrl,
		MessageBody: aws.String(string(data)),
	})
	if err != nil {
		logger.Error("Failed to publish task to external SQS", "queue", qName, "error", err)
		return err
	}
	return nil
}

func publishTask(taskType string, payload any) error {
	data, _ := json.Marshal(map[string]any{
		"type":    taskType,
		"payload": payload,
		"time":    time.Now().Format(time.RFC3339),
	})
	_, err := sqsClient.SendMessage(ctx, &sqs.SendMessageInput{
		QueueUrl:    aws.String(queueURL),
		MessageBody: aws.String(string(data)),
	})
	if err != nil {
		logger.Error("Failed to publish task to SQS", "error", err)
		return err
	}
	return nil
}

func main() {
	setupLogger()
	initDB()
	initRedis()
	initSQS()

	go startTaskWorker()

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		c.Next()
		logger.Info("HTTP Request",
			"method", c.Request.Method,
			"path", path,
			"status", c.Writer.Status(),
			"duration", time.Since(start).String(),
			"ip", c.ClientIP(),
		)
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
			"redis":  rdb.Ping(ctx).Err() == nil,
		})
	})

	api := r.Group("/")
	api.Use(authMiddleware())
	{
		api.GET("/tournament/:tournamentId", listMatchesByTournament)
		api.POST("/bulk", bulkCreateMatches)
		api.DELETE("/tournament/:tournamentId", deleteMatchesByTournament)
		api.POST("/tournament/:tournamentId/simulate", bulkSimulateMatches)

		api.GET("/:id", getMatch)
		api.PUT("/:id/score", updateScore)
		api.POST("/:id/simulate", simulateMatch)
		api.POST("/:id/events", addEvent)
		api.PUT("/:id/status", updateStatus)
		api.PUT("/:id/timer", syncTimer)

		// Admin only
		admin := api.Group("/admin")
		admin.Use(adminOnly())
		{
			admin.GET("/logs", getLogs)
			admin.GET("/mq-stats", getMQStats)
			admin.POST("/trigger-task", triggerTestTask)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}
	r.Run(":" + port)
}

func triggerTestTask(c *gin.Context) {
	var input struct {
		Type    string `json:"type"`
		Payload string `json:"payload"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Type == "" {
		input.Type = "MATCH_SYSTEM_TEST"
	}
	if input.Payload == "" {
		input.Payload = "Manual match task payload generated at " + time.Now().Format(time.RFC822)
	}

	if err := publishTask(input.Type, input.Payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to inject task: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Match task triggered successfully", "type": input.Type})
}

func listMatchesByTournament(c *gin.Context) {
	tid := c.Param("tournamentId")

	// Try Redis first
	cacheKey := fmt.Sprintf("tournament:%s:matches", tid)
	cached, err := rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var matches []Match
		if json.Unmarshal([]byte(cached), &matches) == nil {
			c.JSON(http.StatusOK, matches)
			return
		}
	}

	var matches []Match
	db.Preload("Events").Where("tournament_id = ?", tid).Order("stage asc, round asc, id asc").Find(&matches)

	// Cache for 1 minute
	data, _ := json.Marshal(matches)
	rdb.Set(ctx, cacheKey, data, time.Minute)

	c.JSON(http.StatusOK, matches)
}

func bulkCreateMatches(c *gin.Context) {
	var matches []Match
	if err := c.ShouldBindJSON(&matches); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := db.Create(&matches).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create matches"})
		return
	}

	if len(matches) > 0 {
		rdb.Del(ctx, fmt.Sprintf("tournament:%s:matches", matches[0].TournamentID.String()))
	}

	c.JSON(http.StatusCreated, matches)
}

func deleteMatchesByTournament(c *gin.Context) {
	tid := c.Param("tournamentId")
	round := c.Query("round")
	stage := c.Query("stage")

	query := db.Where("tournament_id = ?", tid)
	if round != "" {
		query = query.Where("round = ?", round)
	}
	if stage != "" {
		query = query.Where("stage = ?", stage)
	}

	query.Delete(&Match{})
	rdb.Del(ctx, fmt.Sprintf("tournament:%s:matches", tid))
	c.JSON(http.StatusOK, gin.H{"message": "Matches deleted"})
}

func adminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		isAdmin, exists := c.Get("is_admin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func getLogs(c *gin.Context) {
	data, err := os.ReadFile("logs/match-service.log")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not read log file"})
		return
	}
	lines := bytes.Split(data, []byte("\n"))
	if len(lines) > 1000 {
		lines = lines[len(lines)-1000:]
	}
	c.Data(http.StatusOK, "text/plain", bytes.Join(lines, []byte("\n")))
}

func getMQStats(c *gin.Context) {
	// Get SQS stats
	attribs, err := sqsClient.GetQueueAttributes(ctx, &sqs.GetQueueAttributesInput{
		QueueUrl: aws.String(queueURL),
		AttributeNames: []types.QueueAttributeName{
			types.QueueAttributeNameApproximateNumberOfMessages,
			types.QueueAttributeNameApproximateNumberOfMessagesNotVisible,
		},
	})

	sqsStats := make(map[string]string)
	if err == nil {
		sqsStats = attribs.Attributes
	}

	// Get last 10 completed tasks from Redis
	completed, _ := rdb.LRange(ctx, taskQueue+":completed", 0, 9).Result()

	c.JSON(http.StatusOK, gin.H{
		"queue_name":   taskQueue,
		"sqs_url":      queueURL,
		"sqs_stats":    sqsStats,
		"completed":    completed,
	})
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization required"})
			c.Abort()
			return
		}

		authURL := os.Getenv("AUTH_SERVICE_URL")
		if authURL == "" {
			authURL = "http://auth-service:8081"
		}

		req, _ := http.NewRequest("GET", authURL+"/verify", nil)
		req.Header.Set("Authorization", authHeader)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			logger.Warn("Auth verify failed", "error", err, "status", resp.StatusCode)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}
		defer resp.Body.Close()

		var res struct {
			UserID   float64 `json:"user_id"`
			Username string  `json:"username"`
			IsAdmin  bool    `json:"is_admin"`
		}
		json.NewDecoder(resp.Body).Decode(&res)

		c.Set("user_id", uint(res.UserID))
		c.Set("username", res.Username)
		c.Set("is_admin", res.IsAdmin)
		c.Next()
	}
}


func getMatch(c *gin.Context) {
	id := c.Param("id")

	// Try Redis
	cacheKey := fmt.Sprintf("match:%s", id)
	cached, err := rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var match Match
		if json.Unmarshal([]byte(cached), &match) == nil {
			c.JSON(http.StatusOK, match)
			return
		}
	}

	var match Match
	if err := db.Preload("Events").First(&match, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Match not found"})
		return
	}

	// Cache for 5 minutes
	data, _ := json.Marshal(match)
	rdb.Set(ctx, cacheKey, data, 5*time.Minute)

	c.JSON(http.StatusOK, match)
}

func updateScore(c *gin.Context) {
	matchID, _ := uuid.Parse(c.Param("id"))
	var input struct {
		Team1Score int `json:"team1_score"`
		Team2Score int `json:"team2_score"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if input.Team1Score < 0 || input.Team2Score < 0 {
		c.JSON(400, gin.H{"error": "Scores cannot be negative"})
		return
	}

	var match Match
	if err := db.First(&match, "id = ?", matchID).Error; err != nil {
		c.JSON(404, gin.H{"error": "Match not found"})
		return
	}

	// Fetch tournament for sport engine logic
	tourneyURL := os.Getenv("TOURNAMENT_SERVICE_URL")
	if tourneyURL == "" {
		tourneyURL = "http://tournament-service:8082"
	}
	tReq, _ := http.NewRequest("GET", tourneyURL+"/"+match.TournamentID.String(), nil)
	tReq.Header.Set("Authorization", c.GetHeader("Authorization"))
	tResp, err := (&http.Client{}).Do(tReq)

	var tournament Tournament
	if err == nil {
		defer tResp.Body.Close()
		json.NewDecoder(tResp.Body).Decode(&tournament)
	}

	match.Team1Score = input.Team1Score
	match.Team2Score = input.Team2Score
	match.IsPlayed = true
	match.Status = "completed"

	// Determine winner
	if match.Team1Score > match.Team2Score {
		match.WinnerID = &match.Team1ID
	} else if match.Team2Score > match.Team1Score {
		match.WinnerID = &match.Team2ID
	} else if tournament.Type == "knockout" || tournament.Type == "double_elimination" || match.Stage > 0 {
		// Force winner in knockout
		match.Team1Score++
		match.WinnerID = &match.Team1ID
	} else {
		match.WinnerID = nil
	}

	if err := db.Save(&match).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to save match score"})
		return
	}

	// Advance logic (aggregate aware)
	if tournament.Type == "knockout" || tournament.Type == "double_elimination" || match.Stage > 0 {
		handleKnockoutAdvancement(match, tournament)
	}

	// Invalidate cache
	rdb.Del(ctx, fmt.Sprintf("match:%s", match.ID.String()))
	rdb.Del(ctx, fmt.Sprintf("tournament:%s:matches", match.TournamentID.String()))

	broadcastUpdate(match.TournamentID.String(), "match_update", match)
	publishMatchCompleted(match)
	c.JSON(http.StatusOK, match)
}

func simulateMatch(c *gin.Context) {
	matchID, _ := uuid.Parse(c.Param("id"))
	var match Match
	if err := db.First(&match, "id = ?", matchID).Error; err != nil {
		c.JSON(404, gin.H{"error": "Match not found"})
		return
	}

	if match.IsPlayed {
		c.JSON(400, gin.H{"error": "Match already played"})
		return
	}

	// Fetch tournament context
	tourneyURL := os.Getenv("TOURNAMENT_SERVICE_URL")
	if tourneyURL == "" {
		tourneyURL = "http://tournament-service:8082"
	}
	tReq, _ := http.NewRequest("GET", tourneyURL+"/"+match.TournamentID.String(), nil)
	tReq.Header.Set("Authorization", c.GetHeader("Authorization"))
	tResp, err := (&http.Client{}).Do(tReq)

	var tournament Tournament
	if err == nil {
		defer tResp.Body.Close()
		json.NewDecoder(tResp.Body).Decode(&tournament)
	}

	performSimulation(&match, tournament)

	// Invalidate cache
	rdb.Del(ctx, fmt.Sprintf("match:%s", match.ID.String()))
	rdb.Del(ctx, fmt.Sprintf("tournament:%s:matches", match.TournamentID.String()))

	broadcastUpdate(match.TournamentID.String(), "match_update", match)
	publishMatchCompleted(match)
	c.JSON(http.StatusOK, match)
}

func bulkSimulateMatches(c *gin.Context) {
	tid := c.Param("tournamentId")
	stage := c.Query("stage")
	round := c.Query("round")
	authHeader := c.GetHeader("Authorization")

	publishTask("BULK_SIMULATE", map[string]string{
		"tournament_id": tid,
		"auth_token":    authHeader,
		"stage":         stage,
		"round":         round,
	})

	c.JSON(200, gin.H{"message": "Bulk simulation queued"})
}

func performSimulation(match *Match, tournament Tournament) {
	// 1. Analyze historical form in this tournament to bias the result
	var history []Match
	db.Where("tournament_id = ? AND is_played = true", match.TournamentID).Find(&history)

	t1Form, t2Form := 1.0, 1.0 // Base multipliers
	for _, m := range history {
		if m.Team1ID == match.Team1ID {
			if m.Team1Score > m.Team2Score {
				t1Form += 0.3
			} else if m.Team1Score == m.Team2Score {
				t1Form += 0.1
			}
			t1Form += float64(m.Team1Score-m.Team2Score) * 0.05
		} else if m.Team2ID == match.Team1ID {
			if m.Team2Score > m.Team1Score {
				t1Form += 0.3
			} else if m.Team2Score == m.Team1Score {
				t1Form += 0.1
			}
			t1Form += float64(m.Team2Score-m.Team1Score) * 0.05
		}

		if m.Team1ID == match.Team2ID {
			if m.Team1Score > m.Team2Score {
				t2Form += 0.3
			} else if m.Team1Score == m.Team2Score {
				t2Form += 0.1
			}
			t2Form += float64(m.Team1Score-m.Team2Score) * 0.05
		} else if m.Team2ID == match.Team2ID {
			if m.Team2Score > m.Team1Score {
				t2Form += 0.3
			} else if m.Team2Score == m.Team1Score {
				t2Form += 0.1
			}
			t2Form += float64(m.Team2Score-m.Team1Score) * 0.05
		}
	}
	// Clamp form to reasonable levels
	if t1Form < 0.5 { t1Form = 0.5 }
	if t2Form < 0.5 { t2Form = 0.5 }
	if t1Form > 2.5 { t1Form = 2.5 }
	if t2Form > 2.5 { t2Form = 2.5 }

	// 2. Generate random score with form-based multipliers
	source := rand.NewSource(time.Now().UnixNano())
	r := rand.New(source)

	match.Team1Score = int(float64(r.Intn(4)) * t1Form)
	match.Team2Score = int(float64(r.Intn(4)) * t2Form)

	// 4. Force outcome in knockout stages if necessary
	if match.Stage > 0 || tournament.Type == "knockout" || tournament.Type == "double_elimination" {
		if tournament.IsDouble && match.TieID != nil {
			var sibling Match
			if err := db.Where("tie_id = ? AND id != ?", *match.TieID, match.ID).First(&sibling).Error; err == nil && sibling.IsPlayed {
				// This is the second leg of a knockout tie
				t1Agg, t2Agg := match.Team1Score, match.Team2Score
				if sibling.Team1ID == match.Team1ID {
					t1Agg += sibling.Team1Score
					t2Agg += sibling.Team2Score
				} else {
					t1Agg += sibling.Team2Score
					t2Agg += sibling.Team1Score
				}
				if t1Agg == t2Agg {
					// Force a winner on aggregate (equivalent to extra time/penalties)
					match.Team1Score++
				}
			}
		} else if match.Team1Score == match.Team2Score {
			// Single leg knockout - no draws allowed
			match.Team1Score++
		}
	}

	match.IsPlayed = true
	match.Status = "completed"

	if match.Team1Score > match.Team2Score {
		match.WinnerID = &match.Team1ID
	} else if match.Team2Score > match.Team1Score {
		match.WinnerID = &match.Team2ID
	} else {
		match.WinnerID = nil
	}

	db.Save(match)

	// handle advancement if knockout or advanced format
	if tournament.Type == "knockout" || tournament.Type == "double_elimination" || match.Stage > 0 {
		handleKnockoutAdvancement(*match, tournament)
	}
}

func handleKnockoutAdvancement(match Match, tournament Tournament) {
	// 1. Handle Winner
	if match.NextMatchID != nil {
		if tournament.IsDouble && match.TieID != nil {
			var sibling Match
			if err := db.Where("tie_id = ? AND id != ?", *match.TieID, match.ID).First(&sibling).Error; err == nil {
				if match.IsPlayed && sibling.IsPlayed {
					var t1Total, t2Total int
					t1Total = match.Team1Score
					t2Total = match.Team2Score
					if sibling.Team1ID == match.Team1ID {
						t1Total += sibling.Team1Score
						t2Total += sibling.Team2Score
					} else {
						t1Total += sibling.Team2Score
						t2Total += sibling.Team1Score
					}

					if t1Total > t2Total {
						performAdvance(match, match.Team1ID)
					} else if t2Total > t1Total {
						performAdvance(match, match.Team2ID)
					}
				}
			}
		} else if match.WinnerID != nil {
			performAdvance(match, *match.WinnerID)
		}
	}

	// 2. Handle Loser (for Double Elimination)
	if match.LoserNextMatchID != nil && match.IsPlayed {
		loserID := uuid.Nil
		if match.WinnerID != nil {
			if *match.WinnerID == match.Team1ID {
				loserID = match.Team2ID
			} else {
				loserID = match.Team1ID
			}
		}

		if loserID != uuid.Nil {
			var nextMatch Match
			if err := db.First(&nextMatch, "id = ?", *match.LoserNextMatchID).Error; err == nil {
				if match.LoserPosition == 0 {
					nextMatch.Team1ID = loserID
				} else {
					nextMatch.Team2ID = loserID
				}
				nextMatch.IsPlayed = false
				nextMatch.Status = "scheduled"
				nextMatch.WinnerID = nil
				db.Save(&nextMatch)
				rdb.Del(ctx, fmt.Sprintf("match:%s", nextMatch.ID.String()))
			}
		}
	}
}

func performAdvance(match Match, winnerID uuid.UUID) {
	var nextMatch Match
	if err := db.First(&nextMatch, "id = ?", *match.NextMatchID).Error; err != nil {
		return
	}

	if match.Position == 0 {
		nextMatch.Team1ID = winnerID
	} else {
		nextMatch.Team2ID = winnerID
	}
	nextMatch.IsPlayed = false
	nextMatch.Status = "scheduled"
	nextMatch.WinnerID = nil
	db.Save(&nextMatch)

	// Invalidate next match cache too
	rdb.Del(ctx, fmt.Sprintf("match:%s", nextMatch.ID.String()))
}

func addEvent(c *gin.Context) {
	matchID, _ := uuid.Parse(c.Param("id"))
	var event MatchEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	event.MatchID = matchID
	event.CreatedAt = time.Now()

	db.Create(&event)

	// Update match score automatically based on event
	var match Match
	db.First(&match, matchID)
	if event.Type == "goal" || event.Type == "run" || event.Type == "point_1" {
		if event.TeamID == match.Team1ID {
			match.Team1Score += event.Value
		} else {
			match.Team2Score += event.Value
		}
	} else if event.Type == "point_2" {
		if event.TeamID == match.Team1ID {
			match.Team1Score += 2
		} else {
			match.Team2Score += 2
		}
	} else if event.Type == "point_3" {
		if event.TeamID == match.Team1ID {
			match.Team1Score += 3
		} else {
			match.Team2Score += 3
		}
	}
	db.Save(&match)

	// Invalidate cache
	rdb.Del(ctx, fmt.Sprintf("match:%s", match.ID.String()))
	rdb.Del(ctx, fmt.Sprintf("tournament:%s:matches", match.TournamentID.String()))

	broadcastUpdate(match.TournamentID.String(), "match_event", event)
	c.JSON(http.StatusCreated, event)
}

func updateStatus(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Status string `json:"status"`
	}
	c.ShouldBindJSON(&input)
	db.Model(&Match{}).Where("id = ?", id).Update("status", input.Status)

	rdb.Del(ctx, fmt.Sprintf("match:%s", id))

	var m Match
	if err := db.First(&m, "id = ?", id).Error; err == nil {
		rdb.Del(ctx, fmt.Sprintf("tournament:%s:matches", m.TournamentID.String()))
	}

	c.JSON(200, gin.H{"message": "Status updated"})
}

func syncTimer(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Time int `json:"time"`
	}
	c.ShouldBindJSON(&input)
	db.Model(&Match{}).Where("id = ?", id).Update("current_time", input.Time)

	rdb.Del(ctx, fmt.Sprintf("match:%s", id))

	c.JSON(200, gin.H{"message": "Timer synced"})
}

func broadcastUpdate(room, eventType string, data interface{}) {
	realtimeURL := os.Getenv("REALTIME_SERVICE_URL")
	if realtimeURL == "" {
		return
	}

	payload := map[string]interface{}{
		"room": room,
		"type": eventType,
		"data": data,
	}
	body, _ := json.Marshal(payload)
	resp, err := http.Post(realtimeURL+"/broadcast", "application/json", bytes.NewBuffer(body))
	if err != nil {
		logger.Error("Broadcast failed", "error", err)
	} else {
		logger.Info("Broadcast sent", "status", resp.StatusCode)
		resp.Body.Close()
	}
}
