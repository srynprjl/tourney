package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
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

var db *gorm.DB
var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

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
		log.Printf("Failed to connect to database (attempt %d): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatal("Could not connect to database after retries:", err)
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
		log.Println("Default admin account created (username: admin, password: admin)")
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
	initDB()

	r := gin.Default()

	r.POST("/register", register)
	r.POST("/login", login)
	r.GET("/verify", verifyToken)
	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "healthy"}) })

	// Admin endpoints
	adminGroup := r.Group("/admin")
	adminGroup.Use(adminAuthMiddleware())
	{
		adminGroup.GET("/users", listUsers)
		adminGroup.DELETE("/users/:id", deleteUser)
		adminGroup.PUT("/users/:id/toggle-admin", toggleAdmin)
		adminGroup.PUT("/users/:id/toggle-ban", toggleBan)
		adminGroup.GET("/stats", getStats)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	if user.IsBanned {
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}

func verifyToken(c *gin.Context) {
	tokenString := c.GetHeader("Authorization")
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing token"})
		return
	}

	// Remove "Bearer " prefix if present
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

	var user User
	if err := db.First(&user, claims["user_id"]).Error; err == nil && user.IsBanned {
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

// d
// 	var existing Application
// 	if err := db.Where("username = ? OR email = ?", input.Username, input.Email).First(&existing).Error; err == nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "Application already submitted for this username or email"})
// 		return
// 	}

// 	// Check if user already exists
// 	var existingUser User
// 	if err := db.Where("username = ?", input.Username).First(&existingUser).Error; err == nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "Username already taken"})
// 		return
// 	}

// 	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
// 	app := Application{
// 		Username:  input.Username,
// 		Password:  string(hashedPassword),
// 		Email:     input.Email,
// 		Reason:    input.Reason,
// 		CreatedAt: time.Now(),
// 	}

// 	if err := db.Create(&app).Error; err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit application"})
// 		return
// 	}

// 	c.JSON(http.StatusCreated, gin.H{"message": "Application submitted successfully"})
// }
