package main

import (
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Transaction struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `json:"user_id"`
	Amount    float64   `json:"amount"`
	Currency  string    `json:"currency"` // "USD", "NPR"
	Gateway   string    `json:"gateway"` // "stripe", "khalti", "esewa"
	Status    string    `json:"status"` // "pending", "completed", "failed"
	RefID     string    `json:"ref_id"`
	CreatedAt time.Time `json:"created_at"`
}

var db *gorm.DB

func initDB() {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://user:password@db-payment:5432/payment_db?sslmode=disable"
	}
	var err error
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dbURL), &gorm.Config{})
		if err == nil { break }
		time.Sleep(2 * time.Second)
	}
	db.AutoMigrate(&Transaction{})
}

func main() {
	initDB()
	r := gin.Default()

	r.POST("/stripe/pay", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Stripe payment initialized (Test Mode)", "url": "https://stripe.com/test"})
	})

	r.POST("/khalti/pay", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Khalti payment initialized (Test Mode)", "url": "https://khalti.com/test"})
	})

	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "healthy"}) })

	port := os.Getenv("PORT")
	if port == "" { port = "8085" }
	r.Run(":" + port)
}
