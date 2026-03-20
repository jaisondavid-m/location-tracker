package config

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"

	mysqldriver "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"server/models"
)

func InitDB(dsn string, caCertPath string) (*gorm.DB, error) {
	// Load CA certificate for TiDB
	var tlsConfig *tls.Config
	if caCertPath != "" {
		caCert, err := os.ReadFile(caCertPath)
		if err != nil {
			return nil, fmt.Errorf("read CA certificate: %w", err)
		}

		caCertPool := x509.NewCertPool()
		if !caCertPool.AppendCertsFromPEM(caCert) {
			return nil, fmt.Errorf("failed to parse CA certificate")
		}

		tlsConfig = &tls.Config{
			RootCAs: caCertPool,
		}

		// Register TLS config with MySQL driver
		mysqldriver.RegisterTLSConfig("tidb", tlsConfig)

		// Append TLS config to DSN if not already present
		if !containsParam(dsn, "tls=") {
			dsn = dsn + "&tls=tidb"
		}
	}

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	if err := db.AutoMigrate(&models.User{}); err != nil {
		return nil, fmt.Errorf("migrate database: %w", err)
	}

	return db, nil
}

// Helper function to check if DSN already contains a parameter
func containsParam(dsn, param string) bool {
	return len(dsn) > 0 && contains(dsn, param)
}

func contains(s, substr string) bool {
	for i := 0; i < len(s)-len(substr)+1; i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
