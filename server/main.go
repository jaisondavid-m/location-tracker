package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"server/config"
	"server/routes"
)

func main() {
	if err := godotenv.Load(); err != nil {
        log.Println("No .env file found, using system environment variables")
    }
	dsn := os.Getenv("DB_DSN")
	db, err := config.InitDB(dsn)
	if err != nil {
		log.Fatalf("database initialization failed: %v", err)
	}

	r := routes.SetupRouter(db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
