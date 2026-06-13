package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// User model
type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Username  string         `gorm:"unique;not null" json:"username"`
	Password  string         `gorm:"not null" json:"-"`
	IsAdmin   bool           `gorm:"default:false" json:"is_admin"`
	IsBanned  bool           `gorm:"default:false" json:"is_banned"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Application struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"unique;not null" json:"username"`
	Password  string    `json:"-"`
	Email     string    `gorm:"unique;not null" json:"email"`
	Reason    string    `json:"reason"`
	Status    string    `gorm:"default:'pending'" json:"status"` // pending, approved, rejected
	CreatedAt time.Time `json:"created_at"`
}

var (
	db        *gorm.DB
	rdb       *redis.Client
	ctx       = context.Background()
	jwtSecret = []byte(os.Getenv("JWT_SECRET"))
	logger    *slog.Logger
)

const (
	taskQueue = "auth_tasks"
)

func setupLogger() {
	// Create logs directory if it doesn't exist
	if err := os.MkdirAll("logs", 0755); err != nil {
		log.Fatalf("failed to create log directory: %v", err)
	}

	logFile, err := os.OpenFile("logs/auth-service.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("failed to open log file: %v", err)
	}

	// MultiWriter to log to both stdout and file
	multiWriter := io.MultiWriter(os.Stdout, logFile)

	// Create slog logger with JSON handler
	logger = slog.New(slog.NewJSONHandler(multiWriter, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	
	slog.SetDefault(logger)
}

func initDB() {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://user:password@localhost:5432/tournament_db?sslmode=disable"
	}

	var err error
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dbURL), &gorm.Config{})
		if err == nil {
			break
		}
		logger.Warn("Failed to connect to database", "attempt", i+1, "error", err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		logger.Error("Could not connect to database after retries", "error", err)
		os.Exit(1)
	}

	db.AutoMigrate(&User{}, &Application{})

	// Create default admin user if it doesn't exist
	var admin User
	if err := db.Where("username = ?", "admin").First(&admin).Error; err == gorm.ErrRecordNotFound {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
		adminUser := User{
			Username: "admin",
			Password: string(hashedPassword),
			IsAdmin:  true,
		}
		db.Create(&adminUser)
		logger.Info("Default admin account created", "username", "admin")
	}
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

// Simple Task Queue Worker
func startTaskWorker() {
	logger.Info("Starting background task worker")
	for {
		// BLPOP blocks until an element is available in the list
		result, err := rdb.BLPop(ctx, 0, taskQueue).Result()
		if err != nil {
			logger.Error("Error popping task from queue", "error", err)
			time.Sleep(1 * time.Second)
			continue
		}

		// result[0] is the key, result[1] is the value
		taskData := result[1]
		logger.Info("Processing background task", "task_data", taskData)

		// Simulate work
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

func adminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing token"})
			c.Abort()
			return
		}

		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid claims"})
			c.Abort()
			return
		}

		isAdmin, _ := claims["is_admin"].(bool)
		if !isAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}

		c.Set("user_id", claims["user_id"])
		c.Next()
	}
}

func main() {
	setupLogger()
	initDB()
	initRedis()

	// Start background worker
	go startTaskWorker()

	// Set Gin to release mode if needed
	// gin.SetMode(gin.ReleaseMode)
	
	r := gin.New()
	// Use custom logger middleware for Gin
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

	r.POST("/register", register)
	r.POST("/login", login)
	r.GET("/verify", verifyToken)
	r.GET("/health", func(c *gin.Context) { 
		c.JSON(200, gin.H{
			"status": "healthy",
			"db": "connected",
			"redis": rdb.Ping(ctx).Err() == nil,
		}) 
	})

	// Admin endpoints
	adminGroup := r.Group("/admin")
	adminGroup.Use(adminAuthMiddleware())
	{
		adminGroup.GET("/users", listUsers)
		adminGroup.DELETE("/users/:id", deleteUser)
		adminGroup.PUT("/users/:id/toggle-admin", toggleAdmin)
		adminGroup.PUT("/users/:id/toggle-ban", toggleBan)
		adminGroup.GET("/stats", getStats)
		adminGroup.GET("/logs", getLogs)
		adminGroup.GET("/mq-stats", getMQStats)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	logger.Info("Starting auth-service", "port", port)
	r.Run(":" + port)
}

func register(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		logger.Error("Password hashing failed", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := User{
		Username: input.Username,
		Password: string(hashedPassword),
	}

	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username already exists"})
		return
	}

	// Queue a background task (e.g., welcome email, analytics)
	publishTask("user_registration", map[string]any{
		"username": user.Username,
		"user_id":  user.ID,
	})

	logger.Info("User registered", "username", user.Username, "id", user.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "User created successfully"})
}

func login(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user User
	if err := db.Where("username = ?", input.Username).First(&user).Error; err != nil {
		logger.Warn("Login failed: user not found", "username", input.Username)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		logger.Warn("Login failed: incorrect password", "username", input.Username)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	if user.IsBanned {
		logger.Warn("Login failed: user banned", "username", input.Username)
		c.JSON(http.StatusForbidden, gin.H{"error": "Account suspended"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"is_admin": user.IsAdmin,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		logger.Error("Token generation failed", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Queue an analytics task
	publishTask("user_login", map[string]any{
		"username": user.Username,
		"user_id":  user.ID,
		"ip":       c.ClientIP(),
	})

	logger.Info("User logged in", "username", user.Username, "id", user.ID)
	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}

func verifyToken(c *gin.Context) {
	tokenString := c.GetHeader("Authorization")
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing token"})
		return
	}

	if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
		tokenString = tokenString[7:]
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid claims"})
		return
	}

	userID := uint(claims["user_id"].(float64))
	
	// Check Redis for banned status
	bannedKey := fmt.Sprintf("user:%d:banned", userID)
	isBanned, err := rdb.Get(ctx, bannedKey).Result()
	
	if err == redis.Nil {
		// Cache miss, check DB
		var user User
		if err := db.First(&user, userID).Error; err == nil {
			// Cache the result for 10 minutes
			status := "0"
			if user.IsBanned { status = "1" }
			rdb.Set(ctx, bannedKey, status, 10*time.Minute)
			
			if user.IsBanned {
				c.JSON(http.StatusForbidden, gin.H{"error": "Account suspended"})
				return
			}
		}
	} else if err == nil && isBanned == "1" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Account suspended"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id":  claims["user_id"],
		"username": claims["username"],
		"is_admin": claims["is_admin"],
	})
}

func listUsers(c *gin.Context) {
	var users []User
	db.Find(&users)
	c.JSON(http.StatusOK, users)
}

func deleteUser(c *gin.Context) {
	userID := c.Param("id")
	if err := db.Delete(&User{}, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}
	// Invalidate cache
	rdb.Del(ctx, fmt.Sprintf("user:%s:banned", userID))
	
	c.JSON(http.StatusOK, gin.H{"message": "User deleted"})
}

func toggleAdmin(c *gin.Context) {
	userID := c.Param("id")
	var user User
	if err := db.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.IsAdmin = !user.IsAdmin
	if err := db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Admin status updated", "is_admin": user.IsAdmin})
}

func toggleBan(c *gin.Context) {
	userID := c.Param("id")
	var user User
	if err := db.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.IsBanned = !user.IsBanned
	if err := db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}
	
	// Update Redis cache immediately
	bannedKey := fmt.Sprintf("user:%d:banned", user.ID)
	status := "0"
	if user.IsBanned { status = "1" }
	rdb.Set(ctx, bannedKey, status, 10*time.Minute)
	
	c.JSON(http.StatusOK, gin.H{"message": "Ban status updated", "is_banned": user.IsBanned})
}

func getStats(c *gin.Context) {
	var totalUsers int64
	db.Model(&User{}).Count(&totalUsers)

	var adminCount int64
	db.Model(&User{}).Where("is_admin = ?", true).Count(&adminCount)

	c.JSON(http.StatusOK, gin.H{
		"total_users": totalUsers,
		"admin_count": adminCount,
	})
}

func getLogs(c *gin.Context) {
	data, err := os.ReadFile("logs/auth-service.log")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not read log file"})
		return
	}
	// Return last 1000 lines or so to prevent overloading the browser
	lines := bytes.Split(data, []byte("\n"))
	if len(lines) > 1000 {
		lines = lines[len(lines)-1000:]
	}
	c.Data(http.StatusOK, "text/plain", bytes.Join(lines, []byte("\n")))
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
