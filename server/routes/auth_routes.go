package routes

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"server/handlers"
	"server/middlewares"
)

func RegisterAuthRoutes(routerGroup *gin.RouterGroup, db *gorm.DB) {
	handlers.InitAuthHandler(db)

	routerGroup.POST("/register", handlers.Register)
	routerGroup.POST("/login", handlers.Login)
	routerGroup.GET("/me", middlewares.JWTAuth(), handlers.Me)
}
