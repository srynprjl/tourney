package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Tournament struct {
	ID       uuid.UUID `json:"id"`
	Type     string    `json:"type"`
	Sport    string    `json:"sport"`
	IsDouble bool      `json:"is_double"`
}

type Match struct {
	ID           uuid.UUID    `gorm:"type:uuid;primaryKey" json:"id"`
	TournamentID uuid.UUID    `gorm:"type:uuid;not null;index" json:"tournament_id"`
	Team1ID      uuid.UUID    `gorm:"type:uuid" json:"team1_id"`
	Team2ID      uuid.UUID    `gorm:"type:uuid" json:"team2_id"`
	Team1Score   int          `json:"team1_score"`
	Team2Score   int          `json:"team2_score"`
	Round        int          `json:"round"`
	Stage        int          `gorm:"default:0" json:"stage"`
	GroupName    string       `json:"group_name"`
	IsPlayed     bool         `gorm:"default:false" json:"is_played"`
	Status       string       `gorm:"default:scheduled" json:"status"` // "scheduled", "live", "completed"
	CurrentTime  int          `json:"current_time"`                    // In seconds
	Events       []MatchEvent `gorm:"constraint:OnDelete:CASCADE;" json:"events"`
	NextMatchID  *uuid.UUID   `gorm:"type:uuid" json:"next_match_id"`
	TieID        *uuid.UUID   `gorm:"type:uuid" json:"tie_id"`
	WinnerID     *uuid.UUID   `gorm:"type:uuid" json:"winner_id"`
	Position     int          `gorm:"default:0" json:"position"`
}

type MatchEvent struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	MatchID    uuid.UUID `gorm:"type:uuid;not null;index" json:"match_id"`
	Type       string    `json:"type"` // "goal", "card_yellow", "card_red", "wicket", "run", "point_1", "point_2", "point_3"
	TeamID     uuid.UUID `gorm:"type:uuid" json:"team_id"`
	PlayerID   uint      `json:"player_id"`
	PlayerName string    `json:"player_name"`
	Value      int       `json:"value"`  // e.g., runs in cricket
	Minute     int       `json:"minute"` // or ball number in cricket
	CreatedAt  time.Time `json:"created_at"`
}

var db *gorm.DB

func initDB() {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://user:password@db-match:5432/match_db?sslmode=disable"
	}

	var err error
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dbURL), &gorm.Config{})
		if err == nil {
			break
		}
		log.Printf("Failed to connect to match database: %v", err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatal("Could not connect to match database:", err)
	}

	db.AutoMigrate(&Match{}, &MatchEvent{})
}

func main() {
	initDB()

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "healthy"}) })

	api := r.Group("/")
	api.Use(authMiddleware())
	{
		api.GET("/tournament/:tournamentId", listMatchesByTournament)
		api.POST("/bulk", bulkCreateMatches)
		api.DELETE("/tournament/:tournamentId", deleteMatchesByTournament)

		api.GET("/:id", getMatch)
		api.PUT("/:id/score", updateScore)
		api.POST("/:id/events", addEvent)
		api.PUT("/:id/status", updateStatus)
		api.PUT("/:id/timer", syncTimer)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}
	r.Run(":" + port)
}

func listMatchesByTournament(c *gin.Context) {
	tid := c.Param("tournamentId")
	var matches []Match
	db.Preload("Events").Where("tournament_id = ?", tid).Order("stage asc, round asc, id asc").Find(&matches)
	c.JSON(http.StatusOK, matches)
}

func bulkCreateMatches(c *gin.Context) {
	var matches []Match
	if err := c.ShouldBindJSON(&matches); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := db.Create(&matches).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create matches"})
		return
	}
	c.JSON(http.StatusCreated, matches)
}

func deleteMatchesByTournament(c *gin.Context) {
	tid := c.Param("tournamentId")
	db.Where("tournament_id = ?", tid).Delete(&Match{})
	c.JSON(http.StatusOK, gin.H{"message": "Matches deleted"})
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization required"})
			c.Abort()
			return
		}

		authURL := os.Getenv("AUTH_SERVICE_URL")
		if authURL == "" {
			authURL = "http://auth-service:8081"
		}

		req, _ := http.NewRequest("GET", authURL+"/verify", nil)
		req.Header.Set("Authorization", authHeader)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			log.Printf("Auth verify failed: err=%v, status=%v", err, resp.StatusCode)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}
		defer resp.Body.Close()

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

func getMatch(c *gin.Context) {
	id := c.Param("id")
	var match Match
	if err := db.Preload("Events").First(&match, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Match not found"})
		return
	}
	c.JSON(http.StatusOK, match)
}

func updateScore(c *gin.Context) {
	matchID, _ := uuid.Parse(c.Param("id"))
	var input struct {
		Team1Score int `json:"team1_score"`
		Team2Score int `json:"team2_score"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if input.Team1Score < 0 || input.Team2Score < 0 {
		c.JSON(400, gin.H{"error": "Scores cannot be negative"})
		return
	}

	var match Match
	if err := db.First(&match, "id = ?", matchID).Error; err != nil {
		c.JSON(404, gin.H{"error": "Match not found"})
		return
	}

	// Fetch tournament for sport engine logic
	tourneyURL := os.Getenv("TOURNAMENT_SERVICE_URL")
	if tourneyURL == "" {
		tourneyURL = "http://tournament-service:8082"
	}
	tReq, _ := http.NewRequest("GET", tourneyURL+"/"+match.TournamentID.String(), nil)
	tReq.Header.Set("Authorization", c.GetHeader("Authorization"))
	tResp, err := (&http.Client{}).Do(tReq)

	var tournament Tournament
	if err == nil {
		defer tResp.Body.Close()
		json.NewDecoder(tResp.Body).Decode(&tournament)
	}

	match.Team1Score = input.Team1Score
	match.Team2Score = input.Team2Score
	match.IsPlayed = true
	match.Status = "completed"

	// Determine winner
	if match.Team1Score > match.Team2Score {
		match.WinnerID = &match.Team1ID
	} else if match.Team2Score > match.Team1Score {
		match.WinnerID = &match.Team2ID
	} else {
		match.WinnerID = nil
	}

	if err := db.Save(&match).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to save match score"})
		return
	}

	// Advance logic (aggregate aware)
	if tournament.Type == "knockout" || match.Stage == 1 {
		handleKnockoutAdvancement(match, tournament)
	}

	broadcastUpdate(match.TournamentID.String(), "match_update", match)
	c.JSON(http.StatusOK, match)
}

func handleKnockoutAdvancement(match Match, tournament Tournament) {
	if match.NextMatchID == nil {
		return
	}

	if tournament.IsDouble && match.TieID != nil {
		var sibling Match
		if err := db.Where("tie_id = ? AND id != ?", *match.TieID, match.ID).First(&sibling).Error; err == nil {
			if match.IsPlayed && sibling.IsPlayed {
				var t1Total, t2Total int
				t1Total = match.Team1Score
				t2Total = match.Team2Score
				if sibling.Team1ID == match.Team1ID {
					t1Total += sibling.Team1Score
					t2Total += sibling.Team2Score
				} else {
					t1Total += sibling.Team2Score
					t2Total += sibling.Team1Score
				}

				if t1Total > t2Total {
					performAdvance(match, match.Team1ID)
				} else if t2Total > t1Total {
					performAdvance(match, match.Team2ID)
				}
			}
		}
	} else if match.WinnerID != nil {
		performAdvance(match, *match.WinnerID)
	}
}

func performAdvance(match Match, winnerID uuid.UUID) {
	var nextMatch Match
	if err := db.First(&nextMatch, "id = ?", *match.NextMatchID).Error; err != nil {
		return
	}

	if match.Position == 0 {
		nextMatch.Team1ID = winnerID
	} else {
		nextMatch.Team2ID = winnerID
	}
	db.Save(&nextMatch)
}

func addEvent(c *gin.Context) {
	matchID, _ := uuid.Parse(c.Param("id"))
	var event MatchEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	event.MatchID = matchID
	event.CreatedAt = time.Now()

	db.Create(&event)

	// Update match score automatically based on event
	var match Match
	db.First(&match, matchID)
	if event.Type == "goal" || event.Type == "run" || event.Type == "point_1" {
		if event.TeamID == match.Team1ID {
			match.Team1Score += event.Value
		} else {
			match.Team2Score += event.Value
		}
	} else if event.Type == "point_2" {
		if event.TeamID == match.Team1ID {
			match.Team1Score += 2
		} else {
			match.Team2Score += 2
		}
	} else if event.Type == "point_3" {
		if event.TeamID == match.Team1ID {
			match.Team1Score += 3
		} else {
			match.Team2Score += 3
		}
	}
	db.Save(&match)

	broadcastUpdate(match.TournamentID.String(), "match_event", event)
	c.JSON(http.StatusCreated, event)
}

func updateStatus(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Status string `json:"status"`
	}
	c.ShouldBindJSON(&input)
	db.Model(&Match{}).Where("id = ?", id).Update("status", input.Status)
	c.JSON(200, gin.H{"message": "Status updated"})
}

func syncTimer(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Time int `json:"time"`
	}
	c.ShouldBindJSON(&input)
	db.Model(&Match{}).Where("id = ?", id).Update("current_time", input.Time)
	c.JSON(200, gin.H{"message": "Timer synced"})
}

func broadcastUpdate(room, eventType string, data interface{}) {
	realtimeURL := os.Getenv("REALTIME_SERVICE_URL")
	if realtimeURL == "" {
		return
	}

	payload := map[string]interface{}{
		"room": room,
		"type": eventType,
		"data": data,
	}
	body, _ := json.Marshal(payload)
	resp, err := http.Post(realtimeURL+"/broadcast", "application/json", bytes.NewBuffer(body))
	if err != nil {
		log.Printf("Broadcast failed: err=%v", err)
	} else {
		log.Printf("Broadcast sent: status=%d", resp.StatusCode)
		resp.Body.Close()
	}
}
