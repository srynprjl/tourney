package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"log/slog"
	"math/rand"
	"net/http"
	"os"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type TournamentType string

const (
	Knockout TournamentType = "knockout"
	Group    TournamentType = "group"
)

type Tournament struct {
	ID            uuid.UUID        `gorm:"type:uuid;primaryKey" json:"id"`
	Name          string           `gorm:"not null" json:"name"`
	Description   string           `json:"description"`
	SimulationEnabled bool         `gorm:"default:false" json:"simulation_enabled"`
	Type          TournamentType   `gorm:"not null" json:"type"`
	Sport         string           `gorm:"not null" json:"sport"`
	Mode          string           `gorm:"default:self" json:"mode"`
	MaxTeams      int              `gorm:"default:0" json:"max_teams"`
	IsDouble      bool             `gorm:"default:false" json:"is_double"`
	IsPublic      bool             `gorm:"default:false" json:"is_public"`
	GroupCount    int              `gorm:"default:1" json:"group_count"`
	TeamsPerGroup int              `gorm:"default:0" json:"teams_per_group"`
	PromoteCount  int              `gorm:"default:0" json:"promote_count"`
	JoinCode      string           `json:"join_code"`
	StreamLink    string           `json:"stream_link"`
	EntryFee      float64          `gorm:"default:0" json:"entry_fee"`
	CreatorID     uint             `gorm:"not null" json:"creator_id"`
	Teams         []Team           `gorm:"constraint:OnDelete:CASCADE;" json:"teams"`
	Matches       []Match          `gorm:"-" json:"matches"`
	Rules         []Rule           `gorm:"constraint:OnDelete:CASCADE;" json:"rules_list"`
	Prizes        []Prize          `gorm:"constraint:OnDelete:CASCADE;" json:"prizes_list"`
	News          []News           `gorm:"constraint:OnDelete:CASCADE;" json:"news"`
	Sponsors      []Sponsor        `gorm:"constraint:OnDelete:CASCADE;" json:"sponsors"`
	Permissions   []TournamentRole `gorm:"constraint:OnDelete:CASCADE;" json:"permissions"`
	StartDate     time.Time        `json:"start_date"`
	EndDate       time.Time        `json:"end_date"`
	CreatedAt     time.Time        `json:"created_at"`
}

type News struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TournamentID uuid.UUID `gorm:"type:uuid;not null;index" json:"tournament_id"`
	Title        string    `json:"title"`
	Content      string    `json:"content"`
	CreatedAt    time.Time `json:"created_at"`
}

type Rule struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TournamentID uuid.UUID `gorm:"type:uuid;not null;index" json:"tournament_id"`
	Content      string    `json:"content"`
}

type Prize struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TournamentID uuid.UUID `gorm:"type:uuid;not null;index" json:"tournament_id"`
	Rank         string    `json:"rank"`
	Value        string    `json:"value"`
}

type Sponsor struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TournamentID uuid.UUID `gorm:"type:uuid;not null;index" json:"tournament_id"`
	Name         string    `json:"name"`
	LogoURL      string    `json:"logo_url"`
}

type TournamentRole struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TournamentID uuid.UUID `gorm:"type:uuid;not null;index" json:"tournament_id"`
	UserID       uint      `json:"user_id"`
	Role         string    `json:"role"`
}

type Team struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	SquadID      uuid.UUID `gorm:"type:uuid;index" json:"squad_id"`
	Name         string    `gorm:"not null" json:"name"`
	GroupName    string    `json:"group_name"`
	IsManual     bool      `gorm:"default:false" json:"is_manual"`
	TournamentID uuid.UUID `gorm:"type:uuid;not null;index" json:"tournament_id"`
}

type Match struct {
	ID           uuid.UUID  `json:"id"`
	TournamentID uuid.UUID  `json:"tournament_id"`
	Team1ID      uuid.UUID  `json:"team1_id"`
	Team2ID      uuid.UUID  `json:"team2_id"`
	Team1Score   int        `json:"team1_score"`
	Team2Score   int        `json:"team2_score"`
	Round        int        `json:"round"`
	Stage        int        `json:"stage"`
	GroupName    string     `json:"group_name"`
	IsPlayed     bool       `json:"is_played"`
	Status       string     `json:"status"`
	CurrentTime  int        `json:"current_time"`
	NextMatchID  *uuid.UUID `json:"next_match_id"`
	TieID        *uuid.UUID `json:"tie_id"`
	WinnerID     *uuid.UUID `json:"winner_id"`
	Position     int        `json:"position"`
}

var (
	db     *gorm.DB
	rdb    *redis.Client
	ctx    = context.Background()
	logger *slog.Logger
)

const (
	taskQueue = "tournament_tasks"
)

func setupLogger() {
	if err := os.MkdirAll("logs", 0755); err != nil {
		log.Fatalf("failed to create log directory: %v", err)
	}

	logFile, err := os.OpenFile("logs/tournament-service.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
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
		dbURL = "postgres://user:password@db-tournament:5432/tournament_db?sslmode=disable"
	}
	var err error
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dbURL), &gorm.Config{})
		if err == nil {
			break
		}
		logger.Warn("Failed to connect to tournament database", "attempt", i+1, "error", err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		logger.Error("Could not connect to tournament database after retries", "error", err)
		os.Exit(1)
	}
	db.AutoMigrate(&Tournament{}, &Team{}, &News{}, &Rule{}, &Prize{}, &Sponsor{}, &TournamentRole{})
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
	initDB()
	initRedis()

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

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
			"redis":  rdb.Ping(ctx).Err() == nil,
		})
	})

	api := r.Group("/")
	api.Use(authMiddleware())
	{
		api.GET("/", listTournaments)
		api.POST("/", createTournament)
		api.GET("/participating", getParticipatingTournaments)

		api.GET("/:id", getTournament)
		api.GET("/by-code/:code", getTournamentByCode)
		api.PUT("/:id", updateTournament)
		api.DELETE("/:id", deleteTournament)
		api.POST("/:id/news", addNews)
		api.DELETE("/:id/news/:newsId", deleteNews)
		api.POST("/:id/rules", addRule)
		api.DELETE("/:id/rules/:ruleId", deleteRule)
		api.POST("/:id/prizes", addPrize)
		api.DELETE("/:id/prizes/:prizeId", deletePrize)
		api.POST("/:id/sponsors", addSponsor)
		api.POST("/:id/teams", addTeam)
		api.DELETE("/:id/teams/:teamId", removeTeam)
		api.POST("/:id/register", registerTeam)
		api.POST("/:id/generate", generateTournament)
		api.POST("/:id/promote", promoteToKnockout)
		api.GET("/:id/standings", getStandings)

		// Admin only
		admin := api.Group("/admin")
		admin.Use(adminOnly())
		{
			admin.GET("/logs", getLogs)
			admin.GET("/mq-stats", getMQStats)
		}
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	r.Run(":" + port)
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

func getLogs(c *gin.Context) {
	data, err := os.ReadFile("logs/tournament-service.log")
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
			logger.Warn("Auth verify failed in Tournament", "error", err, "status", resp.StatusCode)
			c.AbortWithStatusJSON(401, gin.H{"error": "Invalid token"})
			return
		}
		var vr struct {
			UserID   float64 `json:"user_id"`
			Username string  `json:"username"`
			IsAdmin  bool    `json:"is_admin"`
		}
		json.NewDecoder(resp.Body).Decode(&vr)
		c.Set("user_id", uint(vr.UserID))
		c.Set("username", vr.Username)
		c.Set("is_admin", vr.IsAdmin)
		c.Next()
	}
}


func createTournament(c *gin.Context) {
	var input struct {
		Name          string         `json:"name" binding:"required"`
		Type          TournamentType `json:"type" binding:"required"`
		Sport         string         `json:"sport" binding:"required"`
		Mode          string         `json:"mode" binding:"required"`
		MaxTeams      int            `json:"max_teams"`
		IsDouble      bool           `json:"is_double"`
		IsPublic      bool           `json:"is_public"`
		GroupCount    int            `json:"group_count"`
		TeamsPerGroup int            `json:"teams_per_group"`
		PromoteCount  int            `json:"promote_count"`
		StreamLink    string         `json:"stream_link"`
		EntryFee      float64        `json:"entry_fee"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	uidRaw, _ := c.Get("user_id")
	uid := uidRaw.(uint)
	t := Tournament{
		ID: uuid.New(), Name: input.Name, Type: input.Type, Sport: input.Sport, Mode: input.Mode,
		MaxTeams: input.MaxTeams, IsDouble: input.IsDouble, IsPublic: input.IsPublic,
		GroupCount: input.GroupCount, TeamsPerGroup: input.TeamsPerGroup, PromoteCount: input.PromoteCount,
		StreamLink: input.StreamLink, EntryFee: input.EntryFee,
		CreatorID: uid, JoinCode: uuid.New().String()[:6], CreatedAt: time.Now(),
	}
	db.Create(&t)
	c.JSON(201, t)
}

func listTournaments(c *gin.Context) {
	uidRaw, _ := c.Get("user_id")
	uid := uidRaw.(uint)
	isAdminRaw, _ := c.Get("is_admin")
	isAdmin := isAdminRaw.(bool)

	var ts []Tournament
	if isAdmin {
		db.Find(&ts)
	} else {
		db.Where("creator_id = ? OR is_public = ?", uid, true).Find(&ts)
	}
	c.JSON(200, ts)
}

func getParticipatingTournaments(c *gin.Context) {
	uidRaw, _ := c.Get("user_id")
	uid := uidRaw.(uint)

	// Fetch teams the user belongs to from team-service
	teamURL := os.Getenv("TEAM_SERVICE_URL")
	if teamURL == "" {
		teamURL = "http://team-service:8084"
	}
	req, _ := http.NewRequest("GET", teamURL+"/my", nil)
	req.Header.Set("Authorization", c.GetHeader("Authorization"))
	resp, err := (&http.Client{}).Do(req)

	var myTeams []struct {
		ID uuid.UUID `json:"id"`
	}
	if err == nil {
		defer resp.Body.Close()
		json.NewDecoder(resp.Body).Decode(&myTeams)
	}

	var teamIDs []uuid.UUID
	for _, t := range myTeams {
		teamIDs = append(teamIDs, t.ID)
	}

	var ts []Tournament
	// Tournaments where I am the creator OR one of my teams is registered
	query := db.Distinct("tournaments.*").Joins("LEFT JOIN teams ON teams.tournament_id = tournaments.id")
	if len(teamIDs) > 0 {
		query = query.Where("tournaments.creator_id = ? OR teams.id IN ?", uid, teamIDs)
	} else {
		query = query.Where("tournaments.creator_id = ?", uid)
	}
	query.Find(&ts)

	c.JSON(200, ts)
}

func getTournament(c *gin.Context) {
	var t Tournament
	id := c.Param("id")
	if err := db.Preload("Teams").Preload("News").Preload("Rules").Preload("Prizes").Preload("Sponsors").First(&t, "id = ?", id).Error; err != nil {
		c.JSON(404, gin.H{"error": "Not found"})
		return
	}

	// Fetch matches from match-service
	matchURL := os.Getenv("MATCH_SERVICE_URL")
	if matchURL == "" {
		matchURL = "http://match-service:8083"
	}
	req, _ := http.NewRequest("GET", matchURL+"/tournament/"+id, nil)
	req.Header.Set("Authorization", c.GetHeader("Authorization"))
	resp, err := (&http.Client{}).Do(req)
	if err == nil {
		defer resp.Body.Close()
		json.NewDecoder(resp.Body).Decode(&t.Matches)
	}

	uidRaw, _ := c.Get("user_id")
	uid := uidRaw.(uint)
	isAdminRaw, _ := c.Get("is_admin")
	isAdmin := isAdminRaw.(bool)

	if !t.IsPublic && t.CreatorID != uid && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to private arena"})
		return
	}

	c.JSON(200, t)
}

func getTournamentByCode(c *gin.Context) {
	var t Tournament
	code := c.Param("code")
	if err := db.First(&t, "join_code = ?", code).Error; err != nil {
		c.JSON(404, gin.H{"error": "Arena not found"})
		return
	}
	c.JSON(200, t)
}

func updateTournament(c *gin.Context) {
	var input map[string]interface{}
	c.ShouldBindJSON(&input)
	db.Model(&Tournament{}).Where("id = ?", c.Param("id")).Updates(input)
	c.JSON(200, gin.H{"message": "Updated"})
}

func deleteTournament(c *gin.Context) {
	id := c.Param("id")
	uid := c.MustGet("user_id").(uint)
	isAdmin := c.MustGet("is_admin").(bool)

	var t Tournament
	if err := db.First(&t, "id = ?", id).Error; err != nil {
		c.JSON(404, gin.H{"error": "Tournament not found"})
		return
	}

	if t.CreatorID != uid && !isAdmin {
		c.JSON(403, gin.H{"error": "Unauthorized"})
		return
	}

	// Clear matches in match-service
	matchURL := os.Getenv("MATCH_SERVICE_URL")
	if matchURL == "" {
		matchURL = "http://match-service:8083"
	}
	req, _ := http.NewRequest("DELETE", matchURL+"/tournament/"+id, nil)
	req.Header.Set("Authorization", c.GetHeader("Authorization"))
	(&http.Client{}).Do(req)

	db.Where("tournament_id = ?", id).Delete(&Team{})
	db.Delete(&Tournament{}, "id = ?", id)
	c.JSON(200, gin.H{"message": "Deleted"})
}

func addNews(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	var n News
	c.ShouldBindJSON(&n)
	n.TournamentID = tid
	n.CreatedAt = time.Now()
	db.Create(&n)
	c.JSON(201, n)
}

func deleteNews(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	nid := c.Param("newsId")
	uid := c.MustGet("user_id").(uint)
	isAdmin := c.MustGet("is_admin").(bool)

	var t Tournament
	db.First(&t, "id = ?", tid)
	if t.CreatorID != uid && !isAdmin {
		c.JSON(403, gin.H{"error": "Unauthorized"})
		return
	}

	db.Delete(&News{}, nid)
	c.JSON(200, gin.H{"message": "News deleted"})
}

func addRule(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	var r Rule
	c.ShouldBindJSON(&r)
	r.TournamentID = tid
	db.Create(&r)
	c.JSON(201, r)
}

func deleteRule(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	rid := c.Param("ruleId")
	uid := c.MustGet("user_id").(uint)
	isAdmin := c.MustGet("is_admin").(bool)

	var t Tournament
	db.First(&t, "id = ?", tid)
	if t.CreatorID != uid && !isAdmin {
		c.JSON(403, gin.H{"error": "Unauthorized"})
		return
	}

	db.Delete(&Rule{}, rid)
	c.JSON(200, gin.H{"message": "Rule deleted"})
}

func addPrize(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	var p Prize
	c.ShouldBindJSON(&p)
	p.TournamentID = tid
	db.Create(&p)
	c.JSON(201, p)
}

func deletePrize(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	pid := c.Param("prizeId")
	uid := c.MustGet("user_id").(uint)
	isAdmin := c.MustGet("is_admin").(bool)

	var t Tournament
	db.First(&t, "id = ?", tid)
	if t.CreatorID != uid && !isAdmin {
		c.JSON(403, gin.H{"error": "Unauthorized"})
		return
	}

	db.Delete(&Prize{}, pid)
	c.JSON(200, gin.H{"message": "Prize deleted"})
}

func addSponsor(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	var s Sponsor
	c.ShouldBindJSON(&s)
	s.TournamentID = tid
	db.Create(&s)
	c.JSON(201, s)
}

func addTeam(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	var t Tournament
	if err := db.Preload("Teams").First(&t, "id = ?", tid).Error; err != nil {
		c.JSON(404, gin.H{"error": "Tournament not found"})
		return
	}

	if t.MaxTeams > 0 && len(t.Teams) >= t.MaxTeams {
		c.JSON(400, gin.H{"error": "Tournament is full"})
		return
	}

	var team Team
	c.ShouldBindJSON(&team)
	team.TournamentID = tid
	team.ID = uuid.New()
	team.SquadID = uuid.New() // Manual entry teams get a fresh SquadID
	team.IsManual = true
	db.Create(&team)
	c.JSON(201, team)
}

func registerTeam(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	var input struct {
		TeamID   uuid.UUID `json:"team_id"`
		TeamName string    `json:"team_name"`
		JoinCode string    `json:"join_code"`
	}
	c.ShouldBindJSON(&input)

	var t Tournament
	if err := db.Preload("Teams").First(&t, "id = ?", tid).Error; err != nil {
		c.JSON(404, gin.H{"error": "Tournament not found"})
		return
	}

	if t.MaxTeams > 0 && len(t.Teams) >= t.MaxTeams {
		c.JSON(400, gin.H{"error": "Tournament is full"})
		return
	}

	if !t.IsPublic && t.JoinCode != input.JoinCode {
		c.JSON(403, gin.H{"error": "Invalid code"})
		return
	}
	db.Create(&Team{
		ID:           uuid.New(),
		SquadID:      input.TeamID,
		Name:         input.TeamName,
		TournamentID: tid,
	})
	c.JSON(200, gin.H{"message": "Registered"})
}

func removeTeam(c *gin.Context) {
	tid, _ := uuid.Parse(c.Param("id"))
	teamId, _ := uuid.Parse(c.Param("teamId"))
	uid := c.MustGet("user_id").(uint)
	isAdmin := c.MustGet("is_admin").(bool)

	var t Tournament
	db.First(&t, "id = ?", tid)
	if t.CreatorID != uid && !isAdmin {
		c.JSON(403, gin.H{"error": "Unauthorized"})
		return
	}

	if err := db.Delete(&Team{}, "id = ? AND tournament_id = ?", teamId, tid).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to remove team"})
		return
	}
	c.JSON(200, gin.H{"message": "Team removed"})
}

func getStandings(c *gin.Context) {
	var t Tournament
	id := c.Param("id")
	db.Preload("Teams").First(&t, "id = ?", id)

	// Fetch matches from match-service
	matchURL := os.Getenv("MATCH_SERVICE_URL")
	if matchURL == "" {
		matchURL = "http://match-service:8083"
	}
	req, _ := http.NewRequest("GET", matchURL+"/tournament/"+id, nil)
	req.Header.Set("Authorization", c.GetHeader("Authorization"))
	resp, err := (&http.Client{}).Do(req)
	if err == nil {
		defer resp.Body.Close()
		json.NewDecoder(resp.Body).Decode(&t.Matches)
	}

	c.JSON(200, calculateGroupStandings(t.Teams, t.Matches, ""))
}

func calculateGroupStandings(teams []Team, matches []Match, gn string) []Standing {
	stMap := make(map[uuid.UUID]*Standing)
	for _, tm := range teams {
		stMap[tm.SquadID] = &Standing{TeamID: tm.SquadID, TeamName: tm.Name, GroupName: tm.GroupName}
	}
	for _, m := range matches {
		if m.Stage != 0 || (m.Status == "scheduled" && !m.IsPlayed) {
			continue
		}
		if gn != "" && m.GroupName != gn {
			continue
		}
		t1, t2 := stMap[m.Team1ID], stMap[m.Team2ID]
		if t1 == nil || t2 == nil {
			continue
		}
		t1.Played++
		t2.Played++
		t1.GF += m.Team1Score
		t1.GA += m.Team2Score
		t2.GF += m.Team2Score
		t2.GA += m.Team1Score
		if m.Team1Score > m.Team2Score {
			t1.Wins++
			t1.Points += 3
			t2.Losses++
		} else if m.Team2Score > m.Team1Score {
			t2.Wins++
			t2.Points += 3
			t1.Losses++
		} else {
			t1.Draws++
			t2.Draws++
			t1.Points += 1
			t2.Points += 1
		}
		t1.GD = t1.GF - t1.GA
		t2.GD = t2.GF - t2.GA
	}

	// Find next opponent
	for _, s := range stMap {
		for _, m := range matches {
			if m.Status == "scheduled" && !m.IsPlayed {
				if m.Team1ID == s.TeamID {
					if opp, ok := stMap[m.Team2ID]; ok {
						s.NextOpponent = opp.TeamName
						break
					}
				} else if m.Team2ID == s.TeamID {
					if opp, ok := stMap[m.Team1ID]; ok {
						s.NextOpponent = opp.TeamName
						break
					}
				}
			}
		}
	}

	var out []Standing
	for _, s := range stMap {
		out = append(out, *s)
	}
	return out
}

type Standing struct {
	TeamID       uuid.UUID `json:"team_id"`
	TeamName     string    `json:"team_name"`
	GroupName    string    `json:"group_name"`
	Played       int       `json:"played"`
	Wins         int       `json:"wins"`
	Draws        int       `json:"draws"`
	Losses       int       `json:"losses"`
	GF           int       `json:"gf"`
	GA           int       `json:"ga"`
	GD           int       `json:"gd"`
	Points       int       `json:"points"`
	NextOpponent string    `json:"next_opponent"`
}

func generateTournament(c *gin.Context) {
	var t Tournament
	db.Preload("Teams").First(&t, "id = ?", c.Param("id"))
	authHeader := c.GetHeader("Authorization")
	if t.Type == Knockout {
		generateKOFromTeams(t, t.Teams, authHeader)
	} else {
		generateGroupStage(t, authHeader)
	}
	c.JSON(200, gin.H{"message": "Generated"})
}

func pushMatches(matches []Match, authHeader string) {
	matchURL := os.Getenv("MATCH_SERVICE_URL")
	if matchURL == "" {
		matchURL = "http://match-service:8083"
	}

	if len(matches) == 0 {
		return
	}

	// Delete old matches first
	dReq, _ := http.NewRequest("DELETE", matchURL+"/tournament/"+matches[0].TournamentID.String(), nil)
	dReq.Header.Set("Authorization", authHeader)
	(&http.Client{}).Do(dReq)

	// Bulk create new matches
	body, _ := json.Marshal(matches)
	cReq, _ := http.NewRequest("POST", matchURL+"/bulk", bytes.NewBuffer(body))
	cReq.Header.Set("Authorization", authHeader)
	cReq.Header.Set("Content-Type", "application/json")
	(&http.Client{}).Do(cReq)
}

func generateGroupStage(t Tournament, authHeader string) {
	teams := t.Teams
	n := len(teams)
	g := t.GroupCount
	if g <= 0 {
		g = 1
	}

	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	r.Shuffle(n, func(i, j int) { teams[i], teams[j] = teams[j], teams[i] })

	if g > 1 {
		base := n / g
		remainder := n % g
		for i := range teams {
			var groupIdx int
			if i < remainder*(base+1) {
				groupIdx = i / (base + 1)
			} else {
				groupIdx = remainder + (i-remainder*(base+1))/base
			}
			gn := string(rune('A' + groupIdx))
			teams[i].GroupName = gn
			db.Model(&teams[i]).Update("group_name", gn)
		}
	} else if n > 0 {
		for i := range teams {
			teams[i].GroupName = ""
			db.Model(&teams[i]).Update("group_name", "")
		}
	}

	var allGR [][][]Match
	for j := 0; j < g; j++ {
		gn := ""
		if g > 1 {
			gn = string(rune('A' + j))
		}
		var gts []Team
		for _, tm := range teams {
			if tm.GroupName == gn {
				gts = append(gts, tm)
			}
		}
		allGR = append(allGR, buildRR(t, gts, gn))
	}
	maxR := 0
	for _, gr := range allGR {
		if len(gr) > maxR {
			maxR = len(gr)
		}
	}
	var inv []Match
	curR := 1
	for r := 0; r < maxR; r++ {
		for g := 0; g < len(allGR); g++ {
			if r < len(allGR[g]) {
				for _, m := range allGR[g][r] {
					m.Round = curR
					inv = append(inv, m)
				}
			}
		}
		curR++
	}
	pushMatches(inv, authHeader)
}

func buildRR(t Tournament, teams []Team, gn string) [][]Match {
	n := len(teams)
	if n < 2 {
		return nil
	}
	type Ref struct{ ID uuid.UUID }
	refs := make([]Ref, n)
	for i, tm := range teams {
		refs[i] = Ref{ID: tm.SquadID}
	}
	if n%2 != 0 {
		refs = append(refs, Ref{ID: uuid.Nil})
		n++
	}
	numR := n - 1
	var rounds [][]Match
	for r := 0; r < numR; r++ {
		var rd []Match
		for i := 0; i < n/2; i++ {
			t1, t2 := refs[i], refs[n-1-i]
			if t1.ID != uuid.Nil && t2.ID != uuid.Nil {
				rd = append(rd, Match{ID: uuid.New(), TournamentID: t.ID, GroupName: gn, Team1ID: t1.ID, Team2ID: t2.ID, Stage: 0})
			}
		}
		rounds = append(rounds, rd)
		refs = append([]Ref{refs[0], refs[n-1]}, refs[1:n-1]...)
	}
	if t.IsDouble {
		var dr [][]Match
		for _, rd := range rounds {
			var rrd []Match
			for _, m := range rd {
				rrd = append(rrd, Match{ID: uuid.New(), TournamentID: t.ID, GroupName: gn, Team1ID: m.Team2ID, Team2ID: m.Team1ID, Stage: 0})
			}
			dr = append(dr, rrd)
		}
		rounds = append(rounds, dr...)
	}
	return rounds
}

func generateKOFromTeams(t Tournament, teams []Team, authHeader string) {
	n := len(teams)
	p := 1
	for p*2 <= n {
		p *= 2
	}
	numR1 := n - p
	var r1Ties [][]Match
	for i := 0; i < numR1; i++ {
		tid := uuid.New()
		m1 := Match{ID: uuid.New(), TournamentID: t.ID, Round: 1, Stage: 1, Team1ID: teams[i*2].SquadID, Team2ID: teams[i*2+1].SquadID, Status: "scheduled"}
		if t.IsDouble {
			m1.TieID = &tid
		}
		tie := []Match{m1}
		if t.IsDouble {
			m2 := Match{ID: uuid.New(), TournamentID: t.ID, Round: 1, Stage: 1, TieID: &tid, Team1ID: m1.Team2ID, Team2ID: m1.Team1ID, Status: "scheduled"}
			tie = append(tie, m2)
		}
		r1Ties = append(r1Ties, tie)
	}
	var allR [][][]Match
	tmpP := p
	rn := 2
	if numR1 == 0 {
		rn = 1
	}
	for tmpP >= 2 {
		var rts [][]Match
		for i := 0; i < tmpP/2; i++ {
			tid := uuid.New()
			m1 := Match{ID: uuid.New(), TournamentID: t.ID, Round: rn, Stage: 1, Status: "scheduled"}
			if t.IsDouble {
				m1.TieID = &tid
			}
			tie := []Match{m1}
			if t.IsDouble {
				m2 := Match{ID: uuid.New(), TournamentID: t.ID, Round: rn, Stage: 1, TieID: &tid, Status: "scheduled"}
				tie = append(tie, m2)
			}
			rts = append(rts, tie)
		}
		allR = append(allR, rts)
		tmpP /= 2
		rn++
	}
	for r := 0; r < len(allR)-1; r++ {
		for i, tie := range allR[r] {
			nmid := allR[r+1][i/2][0].ID
			pos := i % 2
			for k := range tie {
				allR[r][i][k].NextMatchID = &nmid
				allR[r][i][k].Position = pos
			}
		}
	}
	if len(allR) > 0 {
		fP2R := allR[0]
		tIdx := numR1 * 2
		for i := 0; i < numR1; i++ {
			nmid := fP2R[i/2][0].ID
			pos := i % 2
			for j := range r1Ties[i] {
				r1Ties[i][j].NextMatchID = &nmid
				r1Ties[i][j].Position = pos
			}
		}
		nByes := p - numR1
		for i := 0; i < nByes; i++ {
			slIdx := numR1 + i
			tTie := fP2R[slIdx/2]
			tmID := teams[tIdx+i].SquadID
			if slIdx%2 == 0 {
				tTie[0].Team1ID = tmID
				if t.IsDouble {
					tTie[1].Team2ID = tmID
				}
			} else {
				tTie[0].Team2ID = tmID
				if t.IsDouble {
					tTie[1].Team1ID = tmID
				}
			}
		}
	}

	var allMatches []Match
	for _, tie := range r1Ties {
		allMatches = append(allMatches, tie...)
	}
	for _, round := range allR {
		for _, tie := range round {
			allMatches = append(allMatches, tie...)
		}
	}
	pushMatches(allMatches, authHeader)
}

func promoteToKnockout(c *gin.Context) {
	var t Tournament
	id := c.Param("id")
	authHeader := c.GetHeader("Authorization")
	db.Preload("Teams").First(&t, "id = ?", id)

	// Fetch matches from match-service for standings
	matchURL := os.Getenv("MATCH_SERVICE_URL")
	if matchURL == "" {
		matchURL = "http://match-service:8083"
	}
	req, _ := http.NewRequest("GET", matchURL+"/tournament/"+id, nil)
	req.Header.Set("Authorization", authHeader)
	resp, err := (&http.Client{}).Do(req)
	if err == nil {
		defer resp.Body.Close()
		json.NewDecoder(resp.Body).Decode(&t.Matches)
	}

	groups := make(map[string][]Team)
	for _, tm := range t.Teams {
		groups[tm.GroupName] = append(groups[tm.GroupName], tm)
	}
	var pts []Team
	for gn, gts := range groups {
		gs := calculateGroupStandings(gts, t.Matches, gn)
		sort.Slice(gs, func(i, j int) bool {
			if gs[i].Points != gs[j].Points {
				return gs[i].Points > gs[j].Points
			}
			return gs[i].GD > gs[j].GD
		})
		for i := 0; i < t.PromoteCount && i < len(gs); i++ {
			for _, tm := range gts {
				if tm.SquadID == gs[i].TeamID {
					pts = append(pts, tm)
					break
				}
			}
		}
	}
	if len(pts) >= 2 {
		generateKOFromTeams(t, pts, authHeader)
	}
	c.JSON(200, gin.H{"message": "Promoted"})
}
