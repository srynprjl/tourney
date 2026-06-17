package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"log/slog"
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

type Team struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string         `gorm:"not null" json:"name"`
	Sport       string         `gorm:"not null" json:"sport"`
	OwnerID     uint           `gorm:"not null" json:"owner_id"`
	InviteCode  string         `gorm:"unique" json:"invite_code"`
	IsPublic    bool           `gorm:"default:false" json:"is_public"`
	Description string         `json:"description"`
	LogoURL     string         `json:"logo_url"`
	Members     []TeamMember   `gorm:"constraint:OnDelete:CASCADE;" json:"members"`
	Posts       []TeamPost     `gorm:"constraint:OnDelete:CASCADE;" json:"posts"`
	Awards      []TeamAward    `gorm:"constraint:OnDelete:CASCADE;" json:"awards"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type TeamAward struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	TeamID      uuid.UUID `gorm:"type:uuid;not null;index" json:"team_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Date        time.Time `json:"date"`
}

type TeamMember struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TeamID    uuid.UUID `gorm:"type:uuid;not null" json:"team_id"`
	UserID    uint      `gorm:"not null" json:"user_id"`
	Username  string    `json:"username"`
	Role      string    `gorm:"default:member" json:"role"` // "owner", "admin", "member", "staff"
	JoinedAt  time.Time `json:"joined_at"`
}

type TeamPost struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TeamID    uuid.UUID `gorm:"type:uuid;not null" json:"team_id"`
	AuthorID  uint      `gorm:"not null" json:"author_id"`
	Content   string    `gorm:"not null" json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type ChatMessage struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TeamID    uuid.UUID `gorm:"type:uuid;not null;index" json:"team_id"`
	UserID    uint      `json:"user_id"`
	Username  string    `json:"username"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type TeamApplication struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TeamID    uuid.UUID `gorm:"type:uuid;not null" json:"team_id"`
	UserID    uint      `gorm:"not null" json:"user_id"`
	Username  string    `json:"username"`
	Message   string    `json:"message"`
	Status    string    `gorm:"default:pending" json:"status"`
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
	taskQueue = "team_tasks"
)

func setupLogger() {
	if err := os.MkdirAll("logs", 0755); err != nil {
		log.Fatalf("failed to create log directory: %v", err)
	}

	logFile, err := os.OpenFile("logs/team-service.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
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
		dbURL = "postgres://user:password@db-team:5432/team_db?sslmode=disable"
	}
	var err error
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dbURL), &gorm.Config{})
		if err == nil {
			break
		}
		logger.Warn("Failed to connect to team database", "attempt", i+1, "error", err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		logger.Error("Could not connect to team database after retries", "error", err)
		os.Exit(1)
	}
	db.AutoMigrate(&Team{}, &TeamMember{}, &TeamPost{}, &TeamApplication{}, &ChatMessage{}, &TeamAward{})
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
		time.Sleep(500 * time.Millisecond)

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
	data, err := os.ReadFile("logs/team-service.log")
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

func listAllTeams(c *gin.Context) {
	var ts []Team
	db.Find(&ts)
	c.JSON(200, ts)
}

func adminDeleteTeam(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))

	var t Team
	if err := db.First(&t, "id = ?", tid).Error; err != nil {
		c.JSON(404, gin.H{"error": "Team not found"})
		return
	}

	db.Where("team_id = ?", tid).Delete(&TeamMember{})
	db.Delete(&t)
	c.JSON(200, gin.H{"message": "Team deleted by admin"})
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
		api.GET("/", listPublicTeams)
		api.POST("/", createTeam)
		api.GET("/my", listMyTeams)
		api.POST("/join", joinTeam)

		api.GET("/:id", getTeam)
		api.DELETE("/:id", deleteTeam)
		api.DELETE("/:id/leave", leaveTeam)
		api.DELETE("/:id/members/:userId", removeMember)
		api.POST("/:id/apply", applyToTeam)
		api.GET("/:id/applications", getApplications)
		api.PUT("/:id/applications/:appId", handleApplication)
		api.POST("/:id/posts", createPost)
		api.GET("/:id/posts", listPosts)
		api.POST("/:id/chat", sendChatMessage)
		api.GET("/:id/chat", getChatHistory)
		api.POST("/:id/awards", addTeamAward)
		api.DELETE("/:id/awards/:awardId", deleteTeamAward)
		api.GET("/:id/history", getTeamHistory)

		// Admin only
		admin := api.Group("/admin")
		admin.Use(adminOnly())
		{
			admin.GET("/logs", getLogs)
			admin.GET("/mq-stats", getMQStats)
			admin.GET("/teams", listAllTeams)
			admin.DELETE("/teams/:id", adminDeleteTeam)
		}
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8084"
	}
	r.Run(":" + port)
}

func createTeam(c *gin.Context) {
	var input struct {
		Name        string `json:"name" binding:"required"`
		Sport       string `json:"sport" binding:"required"`
		Description string `json:"description"`
		IsPublic    bool   `json:"is_public"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	uid := c.MustGet("user_id").(uint)
	uname := c.MustGet("username").(string)

	var existing TeamMember
	if err := db.Where("user_id = ?", uid).First(&existing).Error; err == nil {
		c.JSON(400, gin.H{"error": "You already belong to a squad. Leave your current squad to create a new one."})
		return
	}

	t := Team{ID: uuid.New(), Name: input.Name, Sport: input.Sport, OwnerID: uid, IsPublic: input.IsPublic, Description: input.Description, InviteCode: uuid.New().String()[:8]}
	db.Create(&t)
	db.Create(&TeamMember{TeamID: t.ID, UserID: uid, Username: uname, Role: "owner", JoinedAt: time.Now()})
	c.JSON(201, t)
}

func listPublicTeams(c *gin.Context) {
	var ts []Team
	db.Where("is_public = ?", true).Find(&ts)
	c.JSON(200, ts)
}

func listMyTeams(c *gin.Context) {
	uid := c.MustGet("user_id").(uint)
	var ms []TeamMember
	db.Where("user_id = ?", uid).Find(&ms)
	var ids []uuid.UUID
	for _, m := range ms { ids = append(ids, m.TeamID) }
	var ts []Team
	if len(ids) > 0 { db.Where("id IN ?", ids).Find(&ts) }
	c.JSON(200, ts)
}

func getTeam(c *gin.Context) {
	var t Team
	if err := db.Preload("Members").Preload("Awards").First(&t, "id = ?", c.Param("id")).Error; err != nil {
		c.JSON(404, gin.H{"error": "Not found"})
		return
	}
	c.JSON(200, t)
}

func addTeamAward(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	uid := c.MustGet("user_id").(uint)

	var t Team
	db.First(&t, "id = ?", tid)
	if t.OwnerID != uid {
		c.JSON(403, gin.H{"error": "Only owners can add awards"})
		return
	}

	var a TeamAward
	if err := c.ShouldBindJSON(&a); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	a.TeamID = tid
	a.Date = time.Now()
	db.Create(&a)
	c.JSON(201, a)
}

func deleteTeamAward(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	aid := c.Param("awardId")
	uid := c.MustGet("user_id").(uint)

	var t Team
	db.First(&t, "id = ?", tid)
	if t.OwnerID != uid {
		c.JSON(403, gin.H{"error": "Only owners can delete awards"})
		return
	}

	db.Delete(&TeamAward{}, "id = ? AND team_id = ?", aid, tid)
	c.JSON(200, gin.H{"message": "Award deleted"})
}

func getTeamHistory(c *gin.Context) {
	// This would typically come from tournament-service or a shared history service
	// For now, we'll return an empty list or mock data if we want
	c.JSON(200, []interface{}{})
}

func deleteTeam(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	uid := c.MustGet("user_id").(uint)
	
	var t Team
	if err := db.First(&t, "id = ?", tid).Error; err != nil {
		c.JSON(404, gin.H{"error": "Team not found"})
		return
	}

	if t.OwnerID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only owners can disband the team"})
		return
	}

	db.Where("team_id = ?", tid).Delete(&TeamMember{})
	db.Delete(&t)
	c.JSON(200, gin.H{"message": "Squad disbanded successfully"})
}

func joinTeam(c *gin.Context) {
	var input struct { InviteCode string `json:"invite_code" binding:"required"` }
	c.ShouldBindJSON(&input)
	
	uid := c.MustGet("user_id").(uint)
	uname := c.MustGet("username").(string)

	var existing TeamMember
	if err := db.Where("user_id = ?", uid).First(&existing).Error; err == nil {
		c.JSON(400, gin.H{"error": "You already belong to a squad."})
		return
	}

	var t Team
	if err := db.Where("invite_code = ?", input.InviteCode).First(&t).Error; err != nil {
		c.JSON(404, gin.H{"error": "Invalid code"})
		return
	}
	db.Create(&TeamMember{TeamID: t.ID, UserID: uid, Username: uname, Role: "member", JoinedAt: time.Now()})
	c.JSON(200, gin.H{"message": "Joined"})
}

func leaveTeam(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	uid := c.MustGet("user_id").(uint)
	
	var m TeamMember
	if err := db.Where("team_id = ? AND user_id = ?", tid, uid).First(&m).Error; err != nil {
		c.JSON(404, gin.H{"error": "Not a member"})
		return
	}

	if m.Role == "owner" {
		c.JSON(400, gin.H{"error": "Owners must disband the team instead of leaving"})
		return
	}

	db.Delete(&m)
	c.JSON(200, gin.H{"message": "Squad Left"})
}

func removeMember(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	targetUid := c.Param("userId")
	uid := c.MustGet("user_id").(uint)

	var t Team
	db.First(&t, "id = ?", tid)
	if t.OwnerID != uid {
		c.JSON(403, gin.H{"error": "Only owners can remove members"})
		return
	}

	db.Where("team_id = ? AND user_id = ?", tid, targetUid).Delete(&TeamMember{})
	c.JSON(200, gin.H{"message": "Member removed"})
}

func applyToTeam(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	var input struct { Message string `json:"message"` }
	c.ShouldBindJSON(&input)
	uid := c.MustGet("user_id").(uint)
	uname := c.MustGet("username").(string)

	var existing TeamMember
	if err := db.Where("team_id = ? AND user_id = ?", tid, uid).First(&existing).Error; err == nil {
		c.JSON(400, gin.H{"error": "You already belong to this squad."})
		return
	}

	var existingApp TeamApplication
	if err := db.Where("team_id = ? AND user_id = ? AND status = ?", tid, uid, "pending").First(&existingApp).Error; err == nil {
		c.JSON(400, gin.H{"error": "Application already pending for this squad."})
		return
	}

	db.Create(&TeamApplication{TeamID: tid, UserID: uid, Username: uname, Message: input.Message, CreatedAt: time.Now()})
	c.JSON(200, gin.H{"message": "Applied"})
}

func getApplications(c *gin.Context) {
	var as []TeamApplication
	db.Where("team_id = ? AND status = ?", c.Param("id"), "pending").Find(&as)
	c.JSON(200, as)
}

func handleApplication(c *gin.Context) {
	var input struct { Status string `json:"status" binding:"required"` }
	c.ShouldBindJSON(&input)
	var a TeamApplication
	db.First(&a, c.Param("appId"))
	a.Status = input.Status
	db.Save(&a)
	if input.Status == "approved" {
		db.Create(&TeamMember{TeamID: a.TeamID, UserID: a.UserID, Username: a.Username, Role: "member", JoinedAt: time.Now()})
	}
	c.JSON(200, gin.H{"message": "Processed"})
}

func createPost(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	var input struct { Content string `json:"content" binding:"required"` }
	c.ShouldBindJSON(&input)
	uid := c.MustGet("user_id").(uint)
	p := TeamPost{TeamID: tid, AuthorID: uid, Content: input.Content, CreatedAt: time.Now()}
	db.Create(&p)
	c.JSON(201, p)
}

func listPosts(c *gin.Context) {
	var ps []TeamPost
	db.Where("team_id = ?", c.Param("id")).Order("created_at desc").Find(&ps)
	c.JSON(200, ps)
}

func sendChatMessage(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	var input struct { Content string `json:"content" binding:"required"` }
	c.ShouldBindJSON(&input)
	uid := c.MustGet("user_id").(uint)
	uname := c.MustGet("username").(string)
	msg := ChatMessage{TeamID: tid, UserID: uid, Username: uname, Content: input.Content, CreatedAt: time.Now()}
	db.Create(&msg)
	broadcastToTeam(tid.String(), "chat_message", msg)
	c.JSON(201, msg)
}

func getChatHistory(c *gin.Context) {
	var hs []ChatMessage
	db.Where("team_id = ?", c.Param("id")).Order("created_at asc").Limit(50).Find(&hs)
	c.JSON(200, hs)
}

func broadcastToTeam(room, event string, data interface{}) {
	rtURL := os.Getenv("REALTIME_SERVICE_URL")
	if rtURL == "" { return }
	p := map[string]interface{}{"room": room, "type": event, "data": data}
	b, _ := json.Marshal(p)
	http.Post(rtURL+"/broadcast", "application/json", bytes.NewBuffer(b))
}
