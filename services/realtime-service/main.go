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

func startTaskWorker() {
	logger.Info("Starting background task worker")
	for {
		result, err := rdb.BLPop(ctx, 0, taskQueue).Result()
		if err != nil {
			logger.Error("Error popping task from queue", "error", err)
			time.Sleep(1 * time.Second)
			continue
		}
		taskData := result[1]
		logger.Info("Processing background task", "task_data", taskData)
		time.Sleep(500 * time.Millisecond)
		logger.Info("Background task completed", "task_data", taskData)
	}
}

func publishTask(taskType string, payload any) {
	data, _ := json.Marshal(map[string]any{
		"type":    taskType,
		"payload": payload,
		"time":    time.Now().Format(time.RFC3339),
	})
	err := rdb.RPush(ctx, taskQueue, data).Err()
	if err != nil {
		logger.Error("Failed to publish task to Redis", "error", err)
	}
}

func main() {
	setupLogger()
	initRedis()

	// Start Redis Subscriber
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
		if err != nil {
			c.JSON(500, gin.H{"status": "unhealthy", "redis": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "healthy", "redis": "connected"}) 
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
	len, err := rdb.LLen(ctx, taskQueue).Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not get MQ stats"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"queue_name":   taskQueue,
		"queue_length": len,
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

