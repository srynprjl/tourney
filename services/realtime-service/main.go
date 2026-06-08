package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Client struct {
	conn *websocket.Conn
	room string
}

var (
	clients   = make(map[*Client]bool)
	clientsMu sync.Mutex
)

func main() {
	r := gin.Default()

	r.GET("/ws/:room", func(c *gin.Context) {
		room := c.Param("room")
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Println("WS Upgrade Error:", err)
			return
		}

		client := &Client{conn: conn, room: room}
		
		clientsMu.Lock()
		clients[client] = true
		clientsMu.Unlock()

		defer func() {
			clientsMu.Lock()
			delete(clients, client)
			clientsMu.Unlock()
			conn.Close()
		}()

		// Keep alive
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	})

	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "healthy"}) })

	r.POST("/broadcast", func(c *gin.Context) {
		var payload struct {
			Room string      `json:"room"`
			Type string      `json:"type"`
			Data interface{} `json:"data"`
		}
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		msg, _ := json.Marshal(payload)

		clientsMu.Lock()
		for client := range clients {
			if client.room == payload.Room || payload.Room == "global" {
				client.conn.WriteMessage(websocket.TextMessage, msg)
			}
		}
		clientsMu.Unlock()

		c.JSON(200, gin.H{"message": "Broadcast sent"})
	})

	port := os.Getenv("PORT")
	if port == "" { port = "8087" }
	r.Run(":" + port)
}
