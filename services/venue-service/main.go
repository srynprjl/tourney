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

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Venue struct {
	ID                uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Name              string         `gorm:"not null" json:"name"`
	Description       string         `json:"description"`
	Address           string         `json:"address"`
	Latitude          float64        `json:"latitude"`
	Longitude         float64        `json:"longitude"`
	Capacity          int            `json:"capacity"`
	SquareFootage     int            `json:"square_footage"`
	DailyRate         float64        `json:"daily_rate"`
	SecurityDeposit   float64        `json:"security_deposit"`
	OwnerID           uint           `gorm:"not null" json:"owner_id"`
	OwnerName         string         `json:"owner_name"`
	Amenities         string         `json:"amenities"` // Comma-separated or JSON string
	ImageURLs         string         `json:"image_urls"` // JSON array string
	HouseRules        string         `json:"house_rules"`
	CancellationPolicy string        `json:"cancellation_policy"`
	CreatedAt         time.Time      `json:"created_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

type Booking struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	VenueID      uuid.UUID `gorm:"type:uuid;not null;index" json:"venue_id"`
	TournamentID uuid.UUID `gorm:"type:uuid;index" json:"tournament_id"`
	OrganizerID  uint      `gorm:"not null" json:"organizer_id"`
	OrganizerName string    `json:"organizer_name"`
	StartDate    time.Time `gorm:"not null" json:"start_date"`
	EndDate      time.Time `gorm:"not null" json:"end_date"`
	TotalPrice   float64   `json:"total_price"`
	Status       string    `gorm:"default:pending" json:"status"` // pending, confirmed, rejected, cancelled
	CreatedAt    time.Time `json:"created_at"`
}

type ChatMessage struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	BookingID uuid.UUID `gorm:"type:uuid;not null;index" json:"booking_id"`
	UserID    uint      `json:"user_id"`
	Username  string    `json:"username"`
	Content   string    `json:"content"`
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
	taskQueue = "venue_tasks"
)

func setupLogger() {
	if err := os.MkdirAll("logs", 0755); err != nil {
		log.Fatalf("failed to create log directory: %v", err)
	}

	logFile, err := os.OpenFile("logs/venue-service.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
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
		dbURL = "postgres://user:password@db-venue:5432/venue_db?sslmode=disable"
	}
	var err error
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dbURL), &gorm.Config{})
		if err == nil {
			break
		}
		logger.Warn("Failed to connect to venue database", "attempt", i+1, "error", err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		logger.Error("Could not connect to venue database after retries", "error", err)
		os.Exit(1)
	}
	db.AutoMigrate(&Venue{}, &Booking{}, &ChatMessage{})
}

func initRedis() {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis:6379"
	}
	rdb = redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

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
		out, cerr := sqsClient.CreateQueue(ctx, &sqs.CreateQueueInput{
			QueueName: aws.String(taskQueue),
		})
		if cerr == nil {
			queueURL = *out.QueueUrl
			logger.Info("SQS initialized", "queue_url", queueURL)
			return
		}

		gurl, gerr := sqsClient.GetQueueUrl(ctx, &sqs.GetQueueUrlInput{
			QueueName: aws.String(taskQueue),
		})
		if gerr == nil {
			queueURL = *gurl.QueueUrl
			logger.Info("SQS initialized", "queue_url", queueURL)
			return
		}

		logger.Warn("Failed to connect to SQS or create queue", "attempt", i+1, "error", cerr, "gerr", gerr)
		time.Sleep(2 * time.Second)
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
		logger.Info("Request",
			"method", c.Request.Method,
			"path", path,
			"status", c.Writer.Status(),
			"duration", time.Since(start).String(),
			"ip", c.ClientIP(),
		)
	})

	api := r.Group("/")
	api.Use(authMiddleware())
	{
		api.GET("/venues", listVenues)
		api.POST("/venues", createVenue)
		api.GET("/venues/:id", getVenue)
		api.GET("/tournaments/:id/booking", getBookingByTournament)
		api.POST("/venues/:id/book", applyBooking)
		api.GET("/venues/:id/bookings", listVenueBookings)
		
		api.GET("/bookings/my", listMyBookings)
		api.PATCH("/bookings/:id", updateBookingStatus)
		
		api.GET("/bookings/:id/chat", getBookingChat)
		api.POST("/bookings/:id/chat", sendChatMessage)
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "venue-service"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}
	r.Run(":" + port)
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
			c.AbortWithStatusJSON(401, gin.H{"error": "Unauthorized"})
			return
		}

		var res struct {
			UserID   uint   `json:"user_id"`
			Username string `json:"username"`
			IsAdmin  bool   `json:"is_admin"`
		}
		json.NewDecoder(resp.Body).Decode(&res)
		c.Set("user_id", res.UserID)
		c.Set("username", res.Username)
		c.Set("is_admin", res.IsAdmin)
		c.Next()
	}
}

func listVenues(c *gin.Context) {
	var vs []Venue
	db.Find(&vs)
	c.JSON(200, vs)
}

func createVenue(c *gin.Context) {
	uid := c.MustGet("user_id").(uint)
	uname := c.MustGet("username").(string)
	
	var v Venue
	if err := c.ShouldBindJSON(&v); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	
	v.ID = uuid.New()
	v.OwnerID = uid
	v.OwnerName = uname
	v.CreatedAt = time.Now()
	
	if err := db.Create(&v).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to create venue"})
		return
	}
	
	rdb.Publish(ctx, "global_activity", fmt.Sprintf("New arena available for enlisting: %s", v.Name))
	c.JSON(201, v)
}

func getVenue(c *gin.Context) {
	vid, _ := uuid.Parse(c.Param("id"))
	var v Venue
	if err := db.First(&v, "id = ?", vid).Error; err != nil {
		c.JSON(404, gin.H{"error": "Venue not found"})
		return
	}
	c.JSON(200, v)
}

func getBookingByTournament(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	var b Booking
	if err := db.Where("tournament_id = ? AND status = 'confirmed'", tid).First(&b).Error; err != nil {
		c.JSON(404, gin.H{"error": "No confirmed booking found for this operation"})
		return
	}
	c.JSON(200, b)
}

func applyBooking(c *gin.Context) {
	vid, _ := uuid.Parse(c.Param("id"))
	uid := c.MustGet("user_id").(uint)
	uname := c.MustGet("username").(string)

	var input struct {
		TournamentID uuid.UUID `json:"tournament_id"`
		StartDate    time.Time `json:"start_date"`
		EndDate      time.Time `json:"end_date"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// 1. Date validation
	now := time.Now().Truncate(24 * time.Hour)
	if input.StartDate.Before(now) {
		c.JSON(400, gin.H{"error": "Cannot book in the past"})
		return
	}
	if input.EndDate.Before(input.StartDate) {
		c.JSON(400, gin.H{"error": "End date must be after or equal to start date"})
		return
	}

	// 2. Tournament ownership validation
	tournamentURL := os.Getenv("TOURNAMENT_SERVICE_URL")
	if tournamentURL == "" {
		tournamentURL = "http://tournament-service:8082"
	}
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/%s", tournamentURL, input.TournamentID), nil)
	req.Header.Set("Authorization", c.GetHeader("Authorization"))
	resp, err := (&http.Client{}).Do(req)

	if err != nil || resp.StatusCode != 200 {
		c.JSON(400, gin.H{"error": "Failed to verify tournament ownership or tournament not found"})
		return
	}
	defer resp.Body.Close()

	var tournament struct {
		CreatorID uint `json:"creator_id"`
	}
	json.NewDecoder(resp.Body).Decode(&tournament)

	if tournament.CreatorID != uid {
		c.JSON(403, gin.H{"error": "You can only book venues for tournaments you created"})
		return
	}

	var v Venue
	if err := db.First(&v, "id = ?", vid).Error; err != nil {
		c.JSON(404, gin.H{"error": "Venue not found"})
		return
	}

	// Check for date overlaps with CONFIRMED bookings
	var count int64
	db.Model(&Booking{}).Where("venue_id = ? AND status = 'confirmed' AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))",
		vid, input.StartDate, input.StartDate, input.EndDate, input.EndDate, input.StartDate, input.EndDate).Count(&count)

	if count > 0 {
		c.JSON(400, gin.H{"error": "Venue already reserved for selected time window"})
		return
	}

	days := input.EndDate.Sub(input.StartDate).Hours() / 24
	if days < 1 {
		days = 1
	}

	b := Booking{
		ID:            uuid.New(),
		VenueID:       vid,
		TournamentID:  input.TournamentID,
		OrganizerID:   uid,
		OrganizerName: uname,
		StartDate:     input.StartDate,
		EndDate:       input.EndDate,
		TotalPrice:    v.DailyRate * days,
		Status:        "pending",
		CreatedAt:     time.Now(),
	}

	db.Create(&b)
	
	// Notify owner via system feed or specific notification later
	rdb.Publish(ctx, "global_activity", fmt.Sprintf("New booking request for %s by %s", v.Name, uname))
	
	c.JSON(201, b)
}

func listVenueBookings(c *gin.Context) {
	vid, _ := uuid.Parse(c.Param("id"))
	uid := c.MustGet("user_id").(uint)
	
	var v Venue
	db.First(&v, "id = ?", vid)
	
	var bs []Booking
	if v.OwnerID == uid {
		db.Where("venue_id = ?", vid).Find(&bs)
	} else {
		db.Where("venue_id = ? AND status = 'confirmed'", vid).Find(&bs)
	}
	c.JSON(200, bs)
}

func listMyBookings(c *gin.Context) {
	uid := c.MustGet("user_id").(uint)
	var bs []Booking
	db.Where("organizer_id = ? OR venue_id IN (SELECT id FROM venues WHERE owner_id = ?)", uid, uid).Find(&bs)
	c.JSON(200, bs)
}

func updateBookingStatus(c *gin.Context) {
	bid, _ := uuid.Parse(c.Param("id"))
	uid := c.MustGet("user_id").(uint)

	var input struct {
		Status string `json:"status"` // confirmed, rejected
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}

	logger.Info("Attempting to update booking status", "booking_id", bid, "new_status", input.Status, "requesting_user", uid)

	var b Booking
	if err := db.First(&b, "id = ?", bid).Error; err != nil {
		logger.Error("Booking not found", "booking_id", bid)
		c.JSON(404, gin.H{"error": "Booking not found"})
		return
	}

	var v Venue
	if err := db.First(&v, "id = ?", b.VenueID).Error; err != nil {
		logger.Error("Venue not found for booking", "venue_id", b.VenueID, "booking_id", bid)
		c.JSON(404, gin.H{"error": "Venue not found for this booking"})
		return
	}

	if v.OwnerID != uid {
		logger.Warn("Unauthorized status update attempt", "venue_owner", v.OwnerID, "requesting_user", uid)
		c.JSON(403, gin.H{"error": "Only venue owners can update booking status"})
		return
	}

	if input.Status == "confirmed" {
		// Final overlap check before confirming
		var count int64
		db.Model(&Booking{}).Where("venue_id = ? AND status = 'confirmed' AND id != ? AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))",
			b.VenueID, b.ID, b.StartDate, b.StartDate, b.EndDate, b.EndDate, b.StartDate, b.EndDate).Count(&count)
		if count > 0 {
			logger.Warn("Booking confirmation failed due to overlap", "booking_id", bid, "venue_id", b.VenueID)
			c.JSON(400, gin.H{"error": "Overlap detected with existing confirmed booking"})
			return
		}

		// Auto-reject other pending overlaps
		db.Model(&Booking{}).Where("venue_id = ? AND status = 'pending' AND id != ? AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))",
			b.VenueID, b.ID, b.StartDate, b.StartDate, b.EndDate, b.EndDate, b.StartDate, b.EndDate).Update("status", "rejected")
	}

	if err := db.Model(&b).Update("status", input.Status).Error; err != nil {
		logger.Error("Failed to save booking status", "error", err, "booking_id", bid)
		c.JSON(500, gin.H{"error": "Failed to update status"})
		return
	}

	// If confirmed, link venue to tournament
	if input.Status == "confirmed" && b.TournamentID != uuid.Nil {
		linkVenueToTournament(b.TournamentID, b.VenueID, c.GetHeader("Authorization"))
	}

	logger.Info("Booking status updated successfully", "booking_id", bid, "new_status", input.Status)
	c.JSON(200, b)
}

func linkVenueToTournament(tid, vid uuid.UUID, authHeader string) {
	tURL := os.Getenv("TOURNAMENT_SERVICE_URL")
	if tURL == "" {
		tURL = "http://tournament-service:8082"
	}

	body, _ := json.Marshal(map[string]any{"venue_id": vid})
	req, _ := http.NewRequest("PATCH", tURL+"/"+tid.String()+"/venue", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}

	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		logger.Error("Failed to link venue to tournament", "error", err, "tournament_id", tid)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		logger.Error("Tournament service returned non-200 for venue link", "status", resp.Status, "tournament_id", tid)
		return
	}

	logger.Info("Successfully linked venue to tournament", "tournament_id", tid, "venue_id", vid)
}

func getBookingChat(c *gin.Context) {
	bid, _ := uuid.Parse(c.Param("id"))
	var msgs []ChatMessage
	db.Where("booking_id = ?", bid).Order("created_at asc").Find(&msgs)
	c.JSON(200, msgs)
}

func sendChatMessage(c *gin.Context) {
	bid, _ := uuid.Parse(c.Param("id"))
	uid := c.MustGet("user_id").(uint)
	uname := c.MustGet("username").(string)
	
	var m ChatMessage
	if err := c.ShouldBindJSON(&m); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	
	m.BookingID = bid
	m.UserID = uid
	m.Username = uname
	m.CreatedAt = time.Now()
	db.Create(&m)
	
	// Notify via Redis for real-time
	payload, _ := json.Marshal(map[string]any{
		"type": "VENUE_CHAT",
		"data": m,
		"room": bid.String(),
	})
	rdb.Publish(ctx, "broadcast_channel", payload)
	
	c.JSON(201, m)
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
			time.Sleep(1 * time.Second)
			continue
		}
		if len(msgOutput.Messages) == 0 { continue }

		msg := msgOutput.Messages[0]
		// Process tasks if needed
		
		sqsClient.DeleteMessage(ctx, &sqs.DeleteMessageInput{
			QueueUrl:      aws.String(queueURL),
			ReceiptHandle: msg.ReceiptHandle,
		})
	}
}
