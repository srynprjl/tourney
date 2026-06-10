package main

import (
	"encoding/json"
	"net/http"
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
	Awards    []Award   `gorm:"constraint:OnDelete:CASCADE;" json:"awards"`
	Comments  []Comment `gorm:"constraint:OnDelete:CASCADE;" json:"comments"`
	CreatedAt time.Time `json:"created_at"`
}

type Comment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ProfileID uint      `json:"profile_id"`
	AuthorID  uint      `json:"author_id"`
	Author    string    `json:"author"`
	Content   string    `json:"content"`
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
	db.AutoMigrate(&Profile{}, &UserHistory{}, &Report{}, &Award{}, &Comment{})
}

func main() {
	initDB()
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "healthy"}) })

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
		api.POST("/reports", createReport)
	}

	port := os.Getenv("PORT")
	if port == "" { port = "8086" }
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

