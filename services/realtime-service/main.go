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
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Client struct {
	conn *websocket.Conn
	room string
}

var (
	clients   = make(map[*Client]bool)
	clientsMu sync.Mutex
	rdb       *redis.Client
	sqsClient *sqs.Client
	queueURL  string
	ctx       = context.Background()
	logger    *slog.Logger
)

const (
	redisChannel = "broadcast_channel"
	taskQueue    = "realtime_tasks"
)

func setupLogger() {
	if err := os.MkdirAll("logs", 0755); err != nil {
		log.Fatalf("failed to create log directory: %v", err)
	}

	logFile, err := os.OpenFile("logs/realtime-service.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("failed to open log file: %v", err)
	}

	multiWriter := io.MultiWriter(os.Stdout, logFile)
	logger = slog.New(slog.NewJSONHandler(multiWriter, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)
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

func startActivitySubscriber() {
	pubsub := rdb.Subscribe(ctx, "global_activity")
	defer pubsub.Close()

	logger.Info("Global activity subscriber started")
	ch := pubsub.Channel()
	for msg := range ch {
		broadcastToAll("GLOBAL_FEED", msg.Payload)
	}
}

func broadcastToAll(eventType string, data any) {
	payload, _ := json.Marshal(map[string]any{
		"type": eventType,
		"data": data,
		"time": time.Now().Format(time.RFC3339),
	})

	clientsMu.Lock()
	defer clientsMu.Unlock()
	for client := range clients {
		client.conn.WriteMessage(websocket.TextMessage, payload)
	}
}

func main() {
	setupLogger()
	initRedis()
	initSQS()

	// Start subscribers and workers
	go startActivitySubscriber()
	go subscribeToRedis()
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

	r.GET("/ws/:room", func(c *gin.Context) {
		room := c.Param("room")
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			logger.Error("WS Upgrade Error", "error", err)
			return
		}

		client := &Client{conn: conn, room: room}
		
		clientsMu.Lock()
		clients[client] = true
		clientsMu.Unlock()

		defer func() {
			clientsMu.Lock()
			delete(clients, client)
			clientsMu.Unlock()
			conn.Close()
		}()

		// Keep alive
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	})

	r.GET("/health", func(c *gin.Context) { 
		err := rdb.Ping(ctx).Err()
		c.JSON(200, gin.H{
			"status": "healthy", 
			"redis": err == nil,
			"sqs": sqsClient != nil,
		}) 
	})

	r.POST("/broadcast", func(c *gin.Context) {
		var payload struct {
			Room string      `json:"room"`
			Type string      `json:"type"`
			Data interface{} `json:"data"`
		}
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		msg, _ := json.Marshal(payload)
		
		// Publish to Redis instead of local broadcast
		err := rdb.Publish(ctx, redisChannel, msg).Err()
		if err != nil {
			logger.Error("Failed to publish to Redis", "error", err)
			c.JSON(500, gin.H{"error": "Failed to publish to Redis"})
			return
		}

		logger.Info("Broadcast sent to Redis", "room", payload.Room, "type", payload.Type)
		c.JSON(200, gin.H{"message": "Broadcast sent to Redis"})
	})

	admin := r.Group("/admin")
	admin.Use(authMiddleware()) // We need an authMiddleware here too
	admin.Use(adminOnly())
	{
		admin.GET("/logs", getLogs)
		admin.GET("/mq-stats", getMQStats)
	}

	port := os.Getenv("PORT")
	if port == "" { port = "8087" }
	logger.Info("Starting realtime-service", "port", port)
	r.Run(":" + port)
}

func getLogs(c *gin.Context) {
	data, err := os.ReadFile("logs/realtime-service.log")
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

func subscribeToRedis() {
	pubsub := rdb.Subscribe(ctx, redisChannel)
	defer pubsub.Close()

	ch := pubsub.Channel()

	for msg := range ch {
		var payload struct {
			Room string      `json:"room"`
			Type string      `json:"type"`
			Data interface{} `json:"data"`
		}
		if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
			logger.Error("Error unmarshaling Redis message", "error", err)
			continue
		}

		clientsMu.Lock()
		for client := range clients {
			if client.room == payload.Room || payload.Room == "global" {
				client.conn.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
			}
		}
		clientsMu.Unlock()
	}
}

