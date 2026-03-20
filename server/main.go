package main

import (
	"log"
	"os"

	"server/config"
	"server/routes"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}
	dsn := os.Getenv("DB_DSN")
	caCertPath := os.Getenv("DB_CA_CERT_PATH")
	db, err := config.InitDB(dsn, caCertPath)
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
