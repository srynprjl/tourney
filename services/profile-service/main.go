package main

import (
	"os"
	"time"

	"github.com/gin-gonic/gin"
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
	Public    bool      `gorm:"default:true" json:"public"`
	CreatedAt time.Time `json:"created_at"`
}

type UserHistory struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       uint      `gorm:"index" json:"user_id"`
	TournamentID string    `json:"tournament_id"`
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

var db *gorm.DB

func initDB() {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://user:password@db-profile:5432/profile_db?sslmode=disable"
	}
	var err error
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dbURL), &gorm.Config{})
		if err == nil { break }
		time.Sleep(2 * time.Second)
	}
	db.AutoMigrate(&Profile{}, &UserHistory{}, &Report{})
}

func main() {
	initDB()
	r := gin.Default()

	r.GET("/profiles/:username", getProfile)
	r.PUT("/profiles/me", updateProfile)
	r.POST("/reports", createReport)
	
	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "healthy"}) })

	port := os.Getenv("PORT")
	if port == "" { port = "8086" }
	r.Run(":" + port)
}

func getProfile(c *gin.Context) {
	username := c.Param("username")
	var p Profile
	if err := db.Where("username = ?", username).First(&p).Error; err != nil {
		c.JSON(404, gin.H{"error": "Profile not found"})
		return
	}
	c.JSON(200, p)
}

func updateProfile(c *gin.Context) {
	// Identity check would happen here via JWT
	c.JSON(200, gin.H{"message": "Profile updated"})
}

func createReport(c *gin.Context) {
	var r Report
	c.ShouldBindJSON(&r)
	r.CreatedAt = time.Now()
	db.Create(&r)
	c.JSON(201, r)
}
