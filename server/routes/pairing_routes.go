package routes

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"server/handlers"
	"server/middlewares"
)

func RegisterPairingRoutes(routerGroup *gin.RouterGroup, db *gorm.DB) {
	handlers.InitPairingHandler(db)
	child := routerGroup.Group("/child")
	child.Use(middlewares.JWTAuth())
	{
		child.POST("/generate-code",    handlers.GeneratePairingCode) // generate pairing code
		child.GET("/:child_id/parent",  handlers.GetParentByChild)    // get linked parent
	}
	parent := routerGroup.Group("/parent")
	parent.Use(middlewares.JWTAuth())
	{
		parent.POST("/pair",                       handlers.PairWithChild)       // enter code to pair
		parent.GET("/:parent_id/children",         handlers.GetChildrenByParent) // list linked children
	}
}