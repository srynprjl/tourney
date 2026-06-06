package main

import (
	"log"
	"math/rand"
	"net/http"
	"os"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type TournamentType string

const (
	Knockout TournamentType = "knockout"
	Group    TournamentType = "group"
)

type Tournament struct {
	ID             uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Name           string         `gorm:"not null" json:"name"`
	Type           TournamentType `gorm:"not null" json:"type"`
	IsDouble       bool           `gorm:"default:false" json:"is_double"`
	GroupCount     int            `gorm:"default:1" json:"group_count"`
	TeamsPerGroup  int            `gorm:"default:0" json:"teams_per_group"`
	PromoteCount   int            `gorm:"default:0" json:"promote_count"`
	CreatorID      uint           `gorm:"not null" json:"creator_id"`
	Teams          []Team         `gorm:"constraint:OnDelete:CASCADE;" json:"teams"`
	Matches        []Match        `gorm:"constraint:OnDelete:CASCADE;" json:"matches"`
	CreatedAt      time.Time      `json:"created_at"`
}

type Team struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name         string    `gorm:"not null" json:"name"`
	GroupName    string    `json:"group_name"`
	TournamentID uuid.UUID `gorm:"type:uuid;not null" json:"tournament_id"`
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

	db.AutoMigrate(&Tournament{}, &Team{}, &Match{})
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
		authorized.POST("/tournaments", createTournament)
		authorized.GET("/tournaments", listTournaments)
		authorized.GET("/tournaments/:id", getTournament)
		authorized.PUT("/tournaments/:id", updateTournament)
		authorized.DELETE("/tournaments/:id", deleteTournament)
		authorized.POST("/tournaments/:id/teams", addTeam)
		authorized.GET("/tournaments/:id/teams", listTeams)
		authorized.PUT("/tournaments/:id/teams/:teamId", updateTeam)
		authorized.DELETE("/tournaments/:id/teams/:teamId", deleteTeam)
		authorized.POST("/tournaments/:id/generate", generateTournament)
		authorized.POST("/tournaments/:id/promote", promoteToKnockout)
		authorized.GET("/tournaments/:id/standings", getStandings)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	r.Run(":" + port)
}

func createTournament(c *gin.Context) {
	var input struct {
		Name          string         `json:"name" binding:"required"`
		Type          TournamentType `json:"type" binding:"required"`
		IsDouble      bool           `json:"is_double"`
		GroupCount    int            `json:"group_count"`
		TeamsPerGroup int            `json:"teams_per_group"`
		PromoteCount  int            `json:"promote_count"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tournament := Tournament{
		ID:            uuid.New(),
		Name:          input.Name,
		Type:          input.Type,
		IsDouble:      input.IsDouble,
		GroupCount:    input.GroupCount,
		TeamsPerGroup: input.TeamsPerGroup,
		PromoteCount:  input.PromoteCount,
		CreatorID:     1,
	}

	if err := db.Create(&tournament).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tournament"})
		return
	}

	c.JSON(http.StatusCreated, tournament)
}

func updateTournament(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Name          string `json:"name"`
		IsDouble      bool   `json:"is_double"`
		GroupCount    int    `json:"group_count"`
		TeamsPerGroup int    `json:"teams_per_group"`
		PromoteCount  int    `json:"promote_count"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Model(&Tournament{}).Where("id = ?", id).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tournament"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tournament updated"})
}

func deleteTournament(c *gin.Context) {
	id := c.Param("id")
	db.Where("tournament_id = ?", id).Delete(&Match{})
	db.Where("tournament_id = ?", id).Delete(&Team{})
	
	if err := db.Delete(&Tournament{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete tournament"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Tournament deleted"})
}

func listTournaments(c *gin.Context) {
	var tournaments []Tournament
	db.Find(&tournaments)
	c.JSON(http.StatusOK, tournaments)
}

func getTournament(c *gin.Context) {
	id := c.Param("id")
	var tournament Tournament
	if err := db.Preload("Teams").Preload("Matches", func(db *gorm.DB) *gorm.DB {
		return db.Order("stage asc, round asc, group_name asc, id asc")
	}).First(&tournament, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tournament not found"})
		return
	}
	c.JSON(http.StatusOK, tournament)
}

func addTeam(c *gin.Context) {
	tournamentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tournament ID"})
		return
	}

	var input struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	team := Team{
		ID:           uuid.New(),
		Name:         input.Name,
		TournamentID: tournamentID,
	}

	if err := db.Create(&team).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add team"})
		return
	}

	c.JSON(http.StatusCreated, team)
}

func listTeams(c *gin.Context) {
	tournamentID := c.Param("id")
	var teams []Team
	db.Where("tournament_id = ?", tournamentID).Find(&teams)
	c.JSON(http.StatusOK, teams)
}

func updateTeam(c *gin.Context) {
	teamID := c.Param("teamId")
	var input struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Model(&Team{}).Where("id = ?", teamID).Update("name", input.Name).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update team"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Team updated"})
}

func deleteTeam(c *gin.Context) {
	teamID := c.Param("teamId")
	if err := db.Delete(&Team{}, "id = ?", teamID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete team"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Team deleted"})
}

type Standing struct {
	TeamID    uuid.UUID `json:"team_id"`
	TeamName  string    `json:"team_name"`
	GroupName string    `json:"group_name"`
	Played    int       `json:"played"`
	Wins      int       `json:"wins"`
	Draws     int       `json:"draws"`
	Losses    int       `json:"losses"`
	GF        int       `json:"gf"`
	GA        int       `json:"ga"`
	GD        int       `json:"gd"`
	Points    int       `json:"points"`
}

func getStandings(c *gin.Context) {
	id := c.Param("id")
	var tournament Tournament
	if err := db.Preload("Teams").Preload("Matches").First(&tournament, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tournament not found"})
		return
	}

	standingsMap := make(map[uuid.UUID]*Standing)
	for _, team := range tournament.Teams {
		standingsMap[team.ID] = &Standing{TeamID: team.ID, TeamName: team.Name, GroupName: team.GroupName}
	}

	for _, m := range tournament.Matches {
		if m.Stage != 0 || m.Team1ID == uuid.Nil || m.Team2ID == uuid.Nil || !m.IsPlayed {
			continue
		}

		t1 := standingsMap[m.Team1ID]
		t2 := standingsMap[m.Team2ID]
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

	var standings []Standing
	for _, s := range standingsMap {
		standings = append(standings, *s)
	}

	c.JSON(http.StatusOK, standings)
}

func promoteToKnockout(c *gin.Context) {
	id := c.Param("id")
	var tournament Tournament
	if err := db.Preload("Teams").Preload("Matches").First(&tournament, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tournament not found"})
		return
	}

	if tournament.PromoteCount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Promote count not set"})
		return
	}

	groups := make(map[string][]Team)
	if tournament.GroupCount > 1 {
		for _, t := range tournament.Teams {
			groups[t.GroupName] = append(groups[t.GroupName], t)
		}
	} else {
		groups[""] = tournament.Teams
	}

	var promotedTeams []Team
	for gName, gTeams := range groups {
		groupStandings := calculateGroupStandings(gTeams, tournament.Matches, gName)
		sort.Slice(groupStandings, func(i, j int) bool {
			if groupStandings[i].Points != groupStandings[j].Points {
				return groupStandings[i].Points > groupStandings[j].Points
			}
			return groupStandings[i].GD > groupStandings[j].GD
		})

		for i := 0; i < tournament.PromoteCount && i < len(groupStandings); i++ {
			for _, t := range gTeams {
				if t.ID == groupStandings[i].TeamID {
					promotedTeams = append(promotedTeams, t)
					break
				}
			}
		}
	}

	if len(promotedTeams) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Not enough teams to promote"})
		return
	}

	generateKnockoutFromTeams(tournament, promotedTeams)
	c.JSON(http.StatusOK, gin.H{"message": "Promoted to knockout stage", "count": len(promotedTeams)})
}

func calculateGroupStandings(teams []Team, matches []Match, groupName string) []Standing {
	standingsMap := make(map[uuid.UUID]*Standing)
	for _, team := range teams {
		standingsMap[team.ID] = &Standing{TeamID: team.ID, TeamName: team.Name, GroupName: team.GroupName}
	}

	for _, m := range matches {
		if m.Stage != 0 || m.GroupName != groupName || !m.IsPlayed {
			continue
		}

		t1 := standingsMap[m.Team1ID]
		t2 := standingsMap[m.Team2ID]
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

	var standings []Standing
	for _, s := range standingsMap {
		standings = append(standings, *s)
	}
	return standings
}

func generateTournament(c *gin.Context) {
	tournamentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tournament ID"})
		return
	}

	var tournament Tournament
	if err := db.Preload("Teams").First(&tournament, "id = ?", tournamentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tournament not found"})
		return
	}

	if len(tournament.Teams) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least 2 teams are required"})
		return
	}

	if tournament.Type == Group && tournament.GroupCount > 1 {
		requiredTotal := tournament.GroupCount * tournament.TeamsPerGroup
		if len(tournament.Teams) != requiredTotal {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tournament requires exactly " + strconv.Itoa(requiredTotal) + " teams"})
			return
		}
	}

	if tournament.Type == Knockout {
		generateKnockout(tournament)
	} else {
		generateGroupStage(tournament)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tournament generated successfully"})
}

func generateGroupStage(t Tournament) {
	teams := t.Teams
	numTeams := len(teams)
	db.Where("tournament_id = ?", t.ID).Delete(&Match{})

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	rng.Shuffle(numTeams, func(i, j int) {
		teams[i], teams[j] = teams[j], teams[i]
	})

	if t.GroupCount > 1 {
		for i := range teams {
			groupIdx := i / t.TeamsPerGroup
			groupName := string(rune('A' + groupIdx))
			teams[i].GroupName = groupName
			db.Model(&teams[i]).Update("group_name", groupName)
		}
	}

	var allGroupRounds [][][]Match
	for g := 0; g < t.GroupCount; g++ {
		gName := ""
		if t.GroupCount > 1 { gName = string(rune('A' + g)) }
		var gTeams []Team
		for _, tm := range teams {
			if tm.GroupName == gName { gTeams = append(gTeams, tm) }
		}
		allGroupRounds = append(allGroupRounds, buildRoundRobin(t, gTeams, gName))
	}

	maxRounds := 0
	for _, gr := range allGroupRounds {
		if len(gr) > maxRounds { maxRounds = len(gr) }
	}

	var interleaved []Match
	currentRound := 1
	for r := 0; r < maxRounds; r++ {
		for g := 0; g < len(allGroupRounds); g++ {
			if r < len(allGroupRounds[g]) {
				for _, m := range allGroupRounds[g][r] {
					m.Round = currentRound
					interleaved = append(interleaved, m)
				}
			}
		}
		currentRound++
	}
	db.Create(&interleaved)
}

func buildRoundRobin(t Tournament, teams []Team, groupName string) [][]Match {
	n := len(teams)
	if n < 2 { return nil }
	
	type TeamRef struct { ID uuid.UUID }
	refs := make([]TeamRef, n)
	for i, tm := range teams { refs[i] = TeamRef{ID: tm.ID} }
	
	if n%2 != 0 {
		refs = append(refs, TeamRef{ID: uuid.Nil})
		n++
	}

	numRounds := n - 1
	var rounds [][]Match

	for r := 0; r < numRounds; r++ {
		var rd []Match
		for i := 0; i < n/2; i++ {
			t1, t2 := refs[i], refs[n-1-i]
			if t1.ID != uuid.Nil && t2.ID != uuid.Nil {
				rd = append(rd, Match{
					ID: uuid.New(), TournamentID: t.ID, GroupName: groupName,
					Team1ID: t1.ID, Team2ID: t2.ID, Stage: 0,
				})
			}
		}
		rounds = append(rounds, rd)
		refs = append([]TeamRef{refs[0], refs[n-1]}, refs[1:n-1]...)
	}

	if t.IsDouble {
		var doubleRounds [][]Match
		for _, rd := range rounds {
			var revRd []Match
			for _, m := range rd {
				revRd = append(revRd, Match{
					ID: uuid.New(), TournamentID: t.ID, GroupName: groupName,
					Team1ID: m.Team2ID, Team2ID: m.Team1ID, Stage: 0,
				})
			}
			doubleRounds = append(doubleRounds, revRd)
		}
		rounds = append(rounds, doubleRounds...)
	}
	return rounds
}

func generateKnockout(t Tournament) {
	generateKnockoutFromTeams(t, t.Teams)
}

func generateKnockoutFromTeams(t Tournament, teams []Team) {
	numTeams := len(teams)
	db.Where("tournament_id = ? AND stage = 1", t.ID).Delete(&Match{})

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	rng.Shuffle(numTeams, func(i, j int) {
		teams[i], teams[j] = teams[j], teams[i]
	})

	p := 1
	for p*2 <= numTeams {
		p *= 2
	}

	numR1Matches := numTeams - p
	var r1Ties [][]Match

	for i := 0; i < numR1Matches; i++ {
		tieID := uuid.New()
		m1 := Match{
			ID: uuid.New(), TournamentID: t.ID, Round: 1, Stage: 1,
			Team1ID: teams[i*2].ID, Team2ID: teams[i*2+1].ID,
		}
		if t.IsDouble { m1.TieID = &tieID }
		db.Create(&m1)
		tie := []Match{m1}
		if t.IsDouble {
			m2 := Match{
				ID: uuid.New(), TournamentID: t.ID, Round: 1, Stage: 1,
				TieID: &tieID, Team1ID: m1.Team2ID, Team2ID: m1.Team1ID,
			}
			db.Create(&m2)
			tie = append(tie, m2)
		}
		r1Ties = append(r1Ties, tie)
	}

	var allRounds [][][]Match
	tempP := p
	roundNum := 2
	if numR1Matches == 0 { roundNum = 1 }

	for tempP >= 2 {
		var roundTies [][]Match
		for i := 0; i < tempP/2; i++ {
			tieID := uuid.New()
			m1 := Match{ID: uuid.New(), TournamentID: t.ID, Round: roundNum, Stage: 1}
			if t.IsDouble { m1.TieID = &tieID }
			db.Create(&m1)
			tie := []Match{m1}
			if t.IsDouble {
				m2 := Match{ID: uuid.New(), TournamentID: t.ID, Round: roundNum, Stage: 1, TieID: &tieID}
				db.Create(&m2)
				tie = append(tie, m2)
			}
			roundTies = append(roundTies, tie)
		}
		allRounds = append(allRounds, roundTies)
		tempP /= 2
		roundNum++
	}

	for r := 0; r < len(allRounds)-1; r++ {
		for i, tie := range allRounds[r] {
			nextMatchID := allRounds[r+1][i/2][0].ID
			for k := range tie {
				allRounds[r][i][k].NextMatchID = &nextMatchID
				db.Save(&allRounds[r][i][k])
			}
		}
	}

	if len(allRounds) > 0 {
		firstP2Round := allRounds[0]
		teamIdx := numR1Matches * 2
		
		for i := 0; i < numR1Matches; i++ {
			nextMatchID := firstP2Round[i/2][0].ID
			for j := range r1Ties[i] {
				r1Ties[i][j].NextMatchID = &nextMatchID
				db.Save(&r1Ties[i][j])
			}
		}
		
		numByes := p - numR1Matches
		for i := 0; i < numByes; i++ {
			slotIdx := numR1Matches + i
			targetTie := firstP2Round[slotIdx/2]
			teamID := teams[teamIdx+i].ID
			
			if slotIdx % 2 == 0 {
				targetTie[0].Team1ID = teamID
				if t.IsDouble { targetTie[1].Team2ID = teamID }
			} else {
				targetTie[0].Team2ID = teamID
				if t.IsDouble { targetTie[1].Team1ID = teamID }
			}
			db.Save(&targetTie[0])
			if t.IsDouble { db.Save(&targetTie[1]) }
		}
	}
}
