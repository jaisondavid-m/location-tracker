package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"server/models"
)

var locationDB *gorm.DB

func InitLocationHandler(db *gorm.DB) {
	locationDB = db
}

// FIX: Use pointers for lat/lon so binding:"required" doesn't reject 0.0 values.
// A missing field stays nil; a present 0.0 is valid.
func UpdateLocation(c *gin.Context) {
	var req struct {
		ChildID   uint     `json:"child_id"  binding:"required"`
		Latitude  *float64 `json:"latitude"  binding:"required"`
		Longitude *float64 `json:"longitude" binding:"required"`
		Accuracy  float64  `json:"accuracy"`
		Speed     float64  `json:"speed"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if *req.Latitude < -90 || *req.Latitude > 90 || *req.Longitude < -180 || *req.Longitude > 180 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid coordinates"})
		return
	}

	loc := models.Location{
		ChildID:    req.ChildID,
		Latitude:   *req.Latitude,
		Longitude:  *req.Longitude,
		Accuracy:   req.Accuracy,
		Speed:      req.Speed,
		RecordedAt: time.Now(),
	}

	if err := locationDB.Create(&loc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save location"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":     "location updated",
		"location_id": loc.ID,
		"recorded_at": loc.RecordedAt,
	})
}

func GetLatestLocation(c *gin.Context) {
	childID, err := strconv.ParseUint(c.Param("child_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid child_id"})
		return
	}

	var loc models.Location
	if err := locationDB.
		Where("child_id = ?", childID).
		Order("recorded_at DESC").
		First(&loc).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "no location data found for this child"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch location"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"child_id":    loc.ChildID,
		"latitude":    loc.Latitude,
		"longitude":   loc.Longitude,
		"accuracy":    loc.Accuracy,
		"speed":       loc.Speed,
		"recorded_at": loc.RecordedAt,
	})
}

func GetLocationHistory(c *gin.Context) {
	childID, err := strconv.ParseUint(c.Param("child_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid child_id"})
		return
	}

	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			if parsed > 100 {
				parsed = 100
			}
			limit = parsed
		}
	}

	var locations []models.Location
	if err := locationDB.
		Where("child_id = ?", childID).
		Order("recorded_at DESC").
		Limit(limit).
		Find(&locations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"child_id":  childID,
		"count":     len(locations),
		"locations": locations,
	})
}