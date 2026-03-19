package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRouter(db *gorm.DB) *gin.Engine {
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// All route groups now use the same *gin.RouterGroup pattern
	// so JWT middleware and prefixes are applied consistently.
	auth := r.Group("/auth")
	RegisterAuthRoutes(auth, db)

	pairing := r.Group("/pairing")
	RegisterPairingRoutes(pairing, db)

	// FIX: pass a RouterGroup, not the root engine
	location := r.Group("/location")
	RegisterLocationRoutes(location, db)

	return r
}