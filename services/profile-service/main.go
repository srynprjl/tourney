package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"log/slog"
	"math"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Profile struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"unique;index" json:"user_id"`
	Username  string    `json:"username"`
	Bio       string    `json:"bio"`
	AvatarURL string    `json:"avatar_url"`
	Location  string    `json:"location"`
	Rating    int       `gorm:"default:1200" json:"rating"`
	Public    bool      `gorm:"default:true" json:"public"`
	Awards    []Award   `gorm:"constraint:OnDelete:CASCADE;" json:"awards"`
	Comments  []Comment `gorm:"constraint:OnDelete:CASCADE;" json:"comments"`
	CreatedAt time.Time `json:"created_at"`
}

type Comment struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	ProfileID  uint      `json:"profile_id"`
	AuthorID   uint      `json:"author_id"`
	Author     string    `json:"author"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"created_at"`
	LikesCount int       `gorm:"default:0" json:"likes_count"`
	IsLiked    bool      `gorm:"-" json:"is_liked"`
}

type CommentLike struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CommentID uint      `gorm:"index" json:"comment_id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
}

type Award struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ProfileID   uint      `json:"profile_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Date        time.Time `json:"date"`
}

type UserHistory struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       uint      `gorm:"index" json:"user_id"`
	TournamentID string    `json:"tournament_id"`
	MatchID      string    `gorm:"index" json:"match_id"`
	TeamID       string    `json:"team_id"`
	Result       string    `json:"result"` // "winner", "runner_up", "participant"
	Date         time.Time `json:"date"`
}

type Report struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ReporterID uint     `json:"reporter_id"`
	TargetID  string    `json:"target_id"` // user_id or tournament_id
	Type      string    `json:"type"` // "user", "tournament", "team"
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"created_at"`
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
	taskQueue = "profile_tasks"
)

func setupLogger() {
	if err := os.MkdirAll("logs", 0755); err != nil {
		log.Fatalf("failed to create log directory: %v", err)
	}

	logFile, err := os.OpenFile("logs/profile-service.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
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
		dbURL = "postgres://user:password@db-profile:5432/profile_db?sslmode=disable"
	}
	var err error
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dbURL), &gorm.Config{})
		if err == nil {
			break
		}
		logger.Warn("Failed to connect to profile database", "attempt", i+1, "error", err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		logger.Error("Could not connect to profile database after retries", "error", err)
		os.Exit(1)
	}
	db.AutoMigrate(&Profile{}, &UserHistory{}, &Report{}, &Award{}, &Comment{}, &CommentLike{})
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
			if task.Type == "MATCH_COMPLETED" {
				processMatchCompleted(task.Payload)
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

func processMatchCompleted(payload any) {
	data, ok := payload.(map[string]any)
	if !ok {
		return
	}

	matchID, _ := data["match_id"].(string)
	tournamentID, _ := data["tournament_id"].(string)
	team1ID, _ := data["team1_id"].(string)
	team2ID, _ := data["team2_id"].(string)
	winnerID, _ := data["winner_id"].(string)

	// 1. Fetch team rosters
	t1Players := fetchTeamRoster(team1ID)
	t2Players := fetchTeamRoster(team2ID)

	if len(t1Players) == 0 || len(t2Players) == 0 {
		return
	}

	// 2. Get current ratings and calculate team averages
	t1Ratings := getPlayerRatings(t1Players)
	t2Ratings := getPlayerRatings(t2Players)

	avg1 := calculateAverage(t1Ratings)
	avg2 := calculateAverage(t2Ratings)

	// 3. Determine result (1 for win, 0.5 for draw, 0 for loss)
	var s1, s2 float64
	if winnerID == team1ID {
		s1, s2 = 1, 0
	} else if winnerID == team2ID {
		s1, s2 = 0, 1
	} else {
		s1, s2 = 0.5, 0.5
	}

	// 4. Calculate Expected Scores
	e1 := 1.0 / (1.0 + math.Pow(10, (avg2-avg1)/400.0))
	e2 := 1.0 / (1.0 + math.Pow(10, (avg1-avg2)/400.0))

	// 5. Calculate Change (K-factor = 32)
	k := 32.0
	diff1 := int(k * (s1 - e1))
	diff2 := int(k * (s2 - e2))

	// 6. Update individual ratings and record history
	updateRatings(t1Players, diff1, tournamentID, matchID, team1ID, getResultString(s1))
	updateRatings(t2Players, diff2, tournamentID, matchID, team2ID, getResultString(s2))

	logger.Info("Elo updated for match", "match_id", matchID, "team1_diff", diff1, "team2_diff", diff2)
}

func fetchTeamRoster(teamID string) []uint {
	teamURL := os.Getenv("TEAM_SERVICE_URL")
	if teamURL == "" {
		teamURL = "http://team-service:8084"
	}

	resp, err := http.Get(teamURL + "/" + teamID)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	var team struct {
		Members []struct {
			UserID uint `json:"user_id"`
		} `json:"members"`
	}
	json.NewDecoder(resp.Body).Decode(&team)

	var ids []uint
	for _, m := range team.Members {
		ids = append(ids, m.UserID)
	}
	return ids
}

func getPlayerRatings(userIDs []uint) map[uint]int {
	ratings := make(map[uint]int)
	for _, id := range userIDs {
		var p Profile
		if err := db.Where("user_id = ?", id).First(&p).Error; err == nil {
			ratings[id] = p.Rating
		} else {
			ratings[id] = 1200 // default
		}
	}
	return ratings
}

func calculateAverage(ratings map[uint]int) float64 {
	if len(ratings) == 0 {
		return 1200
	}
	sum := 0
	for _, r := range ratings {
		sum += r
	}
	return float64(sum) / float64(len(ratings))
}

func updateRatings(userIDs []uint, diff int, tID, mID, teamID, result string) {
	for _, id := range userIDs {
		// Prevent double processing
		var existing UserHistory
		if err := db.Where("user_id = ? AND match_id = ?", id, mID).First(&existing).Error; err == nil {
			continue
		}

		db.Model(&Profile{}).Where("user_id = ?", id).Update("rating", gorm.Expr("rating + ?", diff))
		db.Create(&UserHistory{
			UserID:       id,
			TournamentID: tID,
			MatchID:      mID,
			TeamID:       teamID,
			Result:       result,
			Date:         time.Now(),
		})
	}
}

func getResultString(s float64) string {
	if s == 1 {
		return "winner"
	}
	if s == 0 {
		return "participant"
	}
	return "draw"
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
			"sqs":    sqsClient != nil,
		})
	})

	api := r.Group("/")
	api.Use(authMiddleware())
	{
		api.GET("/profiles/:username", getProfile)
		api.PUT("/profiles/me", updateProfile)
		api.POST("/profiles/me/awards", addProfileAward)
		api.DELETE("/profiles/me/awards/:id", deleteProfileAward)
		api.GET("/profiles/:username/history", getProfileHistory)
		api.GET("/profiles/:username/comments", getProfileComments)
		api.POST("/profiles/:username/comments", addProfileComment)
		api.DELETE("/comments/:id", deleteComment)
		api.POST("/comments/:id/like", toggleLikeComment)
		api.POST("/reports", createReport)

		// Admin only
		admin := api.Group("/admin")
		admin.Use(adminOnly())
		{
			admin.GET("/logs", getLogs)
			admin.GET("/mq-stats", getMQStats)
			admin.GET("/reports", listReports)
			admin.DELETE("/reports/:id", deleteReport)
		}
	}

	port := os.Getenv("PORT")
	if port == "" { port = "8086" }
	r.Run(":" + port)
}

func toggleLikeComment(c *gin.Context) {
	id := c.Param("id")
	uid := c.MustGet("user_id").(uint)

	var comment Comment
	if err := db.First(&comment, id).Error; err != nil {
		c.JSON(404, gin.H{"error": "Comment not found"})
		return
	}

	var like CommentLike
	if err := db.Where("comment_id = ? AND user_id = ?", id, uid).First(&like).Error; err == nil {
		// Unlike
		db.Delete(&like)
		db.Model(&comment).Update("likes_count", gorm.Expr("likes_count - 1"))
		c.JSON(200, gin.H{"liked": false})
	} else {
		// Like
		like = CommentLike{CommentID: comment.ID, UserID: uid, CreatedAt: time.Now()}
		db.Create(&like)
		db.Model(&comment).Update("likes_count", gorm.Expr("likes_count + 1"))
		c.JSON(200, gin.H{"liked": true})
	}
}

func listReports(c *gin.Context) {
	var reports []Report
	db.Order("created_at desc").Find(&reports)
	c.JSON(200, reports)
}

func deleteReport(c *gin.Context) {
	id := c.Param("id")
	db.Delete(&Report{}, id)
	c.JSON(200, gin.H{"message": "Report resolved/deleted"})
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
	data, err := os.ReadFile("logs/profile-service.log")
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

	queueLen := "0"
	if val, ok := sqsStats[string(types.QueueAttributeNameApproximateNumberOfMessages)]; ok {
		queueLen = val
	}

	// Get last 10 completed tasks from Redis
	completed, _ := rdb.LRange(ctx, taskQueue+":completed", 0, 9).Result()

	c.JSON(http.StatusOK, gin.H{
		"queue_name":   taskQueue,
		"queue_length": queueLen,
		"sqs_url":      queueURL,
		"sqs_stats":    sqsStats,
		"completed":    completed,
	})
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "Unauthorized"})
			return
		}
		authURL := os.Getenv("AUTH_SERVICE_URL")
		if authURL == "" {
			authURL = "http://auth-service:8081"
		}
		req, _ := http.NewRequest("GET", authURL+"/verify", nil)
		req.Header.Set("Authorization", authHeader)
		resp, err := (&http.Client{}).Do(req)
		if err != nil || resp.StatusCode != 200 {
			c.AbortWithStatusJSON(401, gin.H{"error": "Invalid token"})
			return
		}
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


func getProfile(c *gin.Context) {
	username := c.Param("username")
	var p Profile
	if err := db.Preload("Awards").Preload("Comments").Where("username = ?", username).First(&p).Error; err != nil {
		// If not found, check if it's the current user requesting their own profile
		currUname, _ := c.Get("username")
		currUID, _ := c.Get("user_id")

		if currUname != nil && currUname.(string) == username {
			p = Profile{
				UserID:    currUID.(uint),
				Username:  currUname.(string),
				Bio:       "New recruit in the arena.",
				Location:  "Global",
				Public:    true,
				CreatedAt: time.Now(),
			}
			db.Create(&p)
			c.JSON(200, p)
			return
		}

		c.JSON(404, gin.H{"error": "Profile not found"})
		return
	}
	populateCommentLikes(c, p.Comments)
	c.JSON(200, p)
}

func addProfileAward(c *gin.Context) {
	uid := c.MustGet("user_id").(uint)
	var p Profile
	db.Where("user_id = ?", uid).First(&p)

	var a Award
	if err := c.ShouldBindJSON(&a); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	a.ProfileID = p.ID
	a.Date = time.Now()
	db.Create(&a)
	c.JSON(201, a)
}

func deleteProfileAward(c *gin.Context) {
	uid := c.MustGet("user_id").(uint)
	id := c.Param("id")
	var p Profile
	db.Where("user_id = ?", uid).First(&p)

	db.Delete(&Award{}, "id = ? AND profile_id = ?", id, p.ID)
	c.JSON(200, gin.H{"message": "Award deleted"})
}

func getProfileHistory(c *gin.Context) {
	username := c.Param("username")
	var p Profile
	if err := db.Where("username = ?", username).First(&p).Error; err != nil {
		c.JSON(404, gin.H{"error": "Profile not found"})
		return
	}

	var history []UserHistory
	db.Where("user_id = ?", p.UserID).Order("date desc").Find(&history)
	c.JSON(200, history)
}

func updateProfile(c *gin.Context) {
	// Identity check - using user_id from context (consistent with other services)
	uidRaw, exists := c.Get("user_id")
	if !exists {
		// If not set by middleware, try to get from header manually for now if middleware isn't here
		// But let's assume middleware will be added or we just use a simplified version for this task
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}
	uid := uidRaw.(uint)

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	var p Profile
	if err := db.Where("user_id = ?", uid).First(&p).Error; err != nil {
		c.JSON(404, gin.H{"error": "Profile not found"})
		return
	}

	db.Model(&p).Updates(input)
	c.JSON(200, p)
}

func createReport(c *gin.Context) {
	var r Report
	c.ShouldBindJSON(&r)
	r.CreatedAt = time.Now()
	db.Create(&r)
	c.JSON(201, r)
}

func getProfileComments(c *gin.Context) {
	username := c.Param("username")

	var p Profile
	if err := db.Where("username = ?", username).First(&p).Error; err != nil {
		c.JSON(404, gin.H{"error": "Profile not found"})
		return
	}

	var comments []Comment
	db.Where("profile_id = ?", p.ID).Order("created_at desc").Find(&comments)
	populateCommentLikes(c, comments)

	c.JSON(200, comments)
}

func addProfileComment(c *gin.Context) {
	username := c.Param("username")
	var p Profile
	if err := db.Where("username = ?", username).First(&p).Error; err != nil {
		c.JSON(404, gin.H{"error": "Profile not found"})
		return
	}

	var comment Comment
	if err := c.ShouldBindJSON(&comment); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	comment.ProfileID = p.ID
	comment.AuthorID = c.MustGet("user_id").(uint)
	comment.Author = c.MustGet("username").(string)
	comment.CreatedAt = time.Now()

	db.Create(&comment)
	c.JSON(201, comment)
}

func deleteComment(c *gin.Context) {
	id := c.Param("id")
	uid := c.MustGet("user_id").(uint)
	isAdmin := c.MustGet("is_admin").(bool)

	var comment Comment
	if err := db.First(&comment, id).Error; err != nil {
		c.JSON(404, gin.H{"error": "Comment not found"})
		return
	}

	// Check if author OR profile owner OR admin
	var p Profile
	db.First(&p, comment.ProfileID)

	if comment.AuthorID != uid && p.UserID != uid && !isAdmin {
		c.JSON(403, gin.H{"error": "Unauthorized"})
		return
	}

	db.Delete(&comment)
	c.JSON(200, gin.H{"message": "Comment deleted"})
}

func populateCommentLikes(c *gin.Context, comments []Comment) {
	uid, _ := c.Get("user_id")
	if uid == nil {
		return
	}
	for i := range comments {
		var count int64
		db.Model(&CommentLike{}).Where("comment_id = ? AND user_id = ?", comments[i].ID, uid.(uint)).Count(&count)
		comments[i].IsLiked = count > 0
	}
}

