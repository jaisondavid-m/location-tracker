package routes
 
import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
 
	"server/handlers"
	"server/middlewares"
)
 
func RegisterLocationRoutes(routerGroup *gin.RouterGroup, db *gorm.DB) {
	handlers.InitLocationHandler(db)
	routerGroup.Use(middlewares.JWTAuth())
	routerGroup.POST("/update",                 handlers.UpdateLocation)
	routerGroup.GET("/child/:child_id/latest",  handlers.GetLatestLocation)
	routerGroup.GET("/child/:child_id/history", handlers.GetLocationHistory)
}
 