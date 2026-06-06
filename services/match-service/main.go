package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Re-using models from tournament service (in a real app, these would be in a shared package)
type Tournament struct {
	ID       uuid.UUID `json:"id"`
	Type     string    `json:"type"`
	IsDouble bool      `json:"is_double"`
}

type Match struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	TournamentID uuid.UUID  `gorm:"type:uuid;not null" json:"tournament_id"`
	Team1ID      uuid.UUID  `gorm:"type:uuid" json:"team1_id"`
	Team2ID      uuid.UUID  `gorm:"type:uuid" json:"team2_id"`
	Team1Score   int        `json:"team1_score"`
	Team2Score   int        `json:"team2_score"`
	Round        int        `json:"round"`
	Stage        int        `gorm:"default:0" json:"stage"` // 0: Group, 1: Knockout
	GroupName    string     `json:"group_name"`
	IsPlayed     bool       `gorm:"default:false" json:"is_played"`
	NextMatchID  *uuid.UUID `gorm:"type:uuid" json:"next_match_id"`
	TieID        *uuid.UUID `gorm:"type:uuid" json:"tie_id"`
	WinnerID     *uuid.UUID `gorm:"type:uuid" json:"winner_id"`
}

var db *gorm.DB

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
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		authServiceURL := os.Getenv("AUTH_SERVICE_URL")
		if authServiceURL == "" {
			authServiceURL = "http://localhost:8081"
		}

		req, _ := http.NewRequest("GET", authServiceURL+"/verify", nil)
		req.Header.Set("Authorization", authHeader)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		c.Next()
	}
}

func main() {
	initDB()

	r := gin.Default()
	r.Use(corsMiddleware())

	authorized := r.Group("/")
	authorized.Use(authMiddleware())
	{
		authorized.PUT("/matches/:id/score", updateScore)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	r.Run(":" + port)
}

func updateScore(c *gin.Context) {
	matchID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid match ID"})
		return
	}

	var input struct {
		Team1Score int `json:"team1_score"`
		Team2Score int `json:"team2_score"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Team1Score < 0 || input.Team2Score < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Scores cannot be negative"})
		return
	}

	var match Match
	if err := db.First(&match, "id = ?", matchID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Match not found"})
		return
	}

	var tournament Tournament
	db.Table("tournaments").First(&tournament, "id = ?", match.TournamentID)

	match.Team1Score = input.Team1Score
	match.Team2Score = input.Team2Score
	match.IsPlayed = true

	// Determine winner for this specific match
	if match.Team1Score > match.Team2Score {
		match.WinnerID = &match.Team1ID
	} else if match.Team2Score > match.Team1Score {
		match.WinnerID = &match.Team2ID
	} else {
		match.WinnerID = nil
	}

	if err := db.Save(&match).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update match"})
		return
	}

	if tournament.Type == "knockout" || match.Stage == 1 {
		if match.NextMatchID != nil {
			if tournament.IsDouble && match.TieID != nil {
				var sibling Match
				if err := db.Where("tie_id = ? AND id != ?", *match.TieID, match.ID).First(&sibling).Error; err == nil {
					// Only advance if BOTH legs are played
					if match.IsPlayed && sibling.IsPlayed {
						// We need to be careful with team IDs because teams swap in Leg 2
						// Leg 1: A (T1) vs B (T2)
						// Leg 2: B (T1) vs A (T2)
						
						// Calculate totals for Team A (match.Team1ID in Leg 1)
						// For the current match:
						var t1Total, t2Total int
						
						// Use match.ID and sibling.ID to determine which is first leg if needed,
						// but simpler: just look at TeamIDs.
						// Aggregate score for Team 1 of the current match:
						t1Total = match.Team1Score
						t2Total = match.Team2Score
						
						// Add sibling scores. If sibling's Team1 is match's Team2, then sibling's Team1Score belongs to match's Team2.
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
	}

	c.JSON(http.StatusOK, match)
}

func performAdvance(match Match, winnerID uuid.UUID) {
	var nextMatch Match
	if err := db.First(&nextMatch, "id = ?", *match.NextMatchID).Error; err != nil {
		return
	}

	var siblings []Match
	db.Where("next_match_id = ? AND tournament_id = ?", *match.NextMatchID, match.TournamentID).Order("id asc").Find(&siblings)

	// If using TieID, we should find the sibling tie
	if match.TieID != nil {
		// Group siblings by TieID
		found := false
		var distinctTies []uuid.UUID
		tieToMatch := make(map[uuid.UUID]Match)
		for _, s := range siblings {
			if s.TieID != nil {
				if _, ok := tieToMatch[*s.TieID]; !ok {
					tieToMatch[*s.TieID] = s
					distinctTies = append(distinctTies, *s.TieID)
				}
			}
		}
		
		for i, tie := range distinctTies {
			if tie == *match.TieID {
				if i == 0 {
					nextMatch.Team1ID = winnerID
				} else {
					nextMatch.Team2ID = winnerID
				}
				found = true
				break
			}
		}
		if !found && len(siblings) > 0 {
			// Fallback
			if siblings[0].ID == match.ID || (siblings[0].TieID != nil && *siblings[0].TieID == *match.TieID) {
				nextMatch.Team1ID = winnerID
			} else {
				nextMatch.Team2ID = winnerID
			}
		}
	} else {
		if len(siblings) > 0 && siblings[0].ID == match.ID {
			nextMatch.Team1ID = winnerID
		} else {
			nextMatch.Team2ID = winnerID
		}
	}

	db.Save(&nextMatch)
}
