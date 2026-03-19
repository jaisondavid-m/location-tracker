package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"server/models"
)

var pairingDB *gorm.DB

func InitPairingHandler(db *gorm.DB) {
	pairingDB = db
}

func generateCode() (string, error) {
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func GeneratePairingCode(c *gin.Context) {
	var req struct {
		ChildID uint `json:"child_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "child_id is required"})
		return
	}

	if err := pairingDB.Model(&models.PairingCode{}).
		Where("child_id = ? AND is_used = ?", req.ChildID, false).
		Update("is_used", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to clear old codes"})
		return
	}

	code, err := generateCode()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate code"})
		return
	}

	pc := models.PairingCode{
		ChildID:   req.ChildID,
		Code:      code,
		ExpiresAt: time.Now().Add(10 * time.Minute),
		IsUsed:    false,
	}

	if err := pairingDB.Create(&pc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save code"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Pairing code generated",
		"id":         pc.ID,
		"child_id":   pc.ChildID,
		"code":       pc.Code,
		"expires_at": pc.ExpiresAt,
		"is_used":    pc.IsUsed,
	})
}

func PairWithChild(c *gin.Context) {
	var req struct {
		ParentID uint   `json:"parent_id" binding:"required"`
		Code     string `json:"code"      binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "parent_id and code are required"})
		return
	}

	// Fetch the pairing code
	var pc models.PairingCode
	if err := pairingDB.Where("code = ?", req.Code).First(&pc).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid pairing code"})
		return
	}

	if pc.IsUsed {
		c.JSON(http.StatusConflict, gin.H{"error": "Pairing code already used"})
		return
	}

	if time.Now().After(pc.ExpiresAt) {
		c.JSON(http.StatusGone, gin.H{"error": "Pairing code has expired"})
		return
	}

	// Mark code as used
	if err := pairingDB.Model(&pc).Update("is_used", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark code used"})
		return
	}

	// Create parent ↔ child link (upsert)
	link := models.ChildLink{
		ParentID: req.ParentID,
		ChildID:  pc.ChildID,
		LinkedAt: time.Now(),
	}
	if err := pairingDB.
		Where(models.ChildLink{ParentID: req.ParentID, ChildID: pc.ChildID}).
		Assign(models.ChildLink{LinkedAt: link.LinkedAt}).
		FirstOrCreate(&link).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Code accepted but failed to create link"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Successfully paired!",
		"parent_id": req.ParentID,
		"child_id":  pc.ChildID,
	})
}

// ─────────────────────────────────────────
// PARENT: Get all children linked to parent
// GET /api/parent/:parent_id/children
// ─────────────────────────────────────────

func GetChildrenByParent(c *gin.Context) {
	parentID := c.Param("parent_id")

	var links []models.ChildLink
	if err := pairingDB.Where("parent_id = ?", parentID).Find(&links).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}

	type ChildInfo struct {
		ChildID   uint      `json:"child_id"`
		ChildName string    `json:"child_name"`
		LinkedAt  time.Time `json:"linked_at"`
	}

	childIDs := make([]uint, 0, len(links))
	for _, l := range links {
		childIDs = append(childIDs, l.ChildID)
	}

	childNameByID := map[uint]string{}
	if len(childIDs) > 0 {
		var children []models.User
		if err := pairingDB.
			Select("id", "name").
			Where("id IN ? AND role = ?", childIDs, "child").
			Find(&children).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch child details"})
			return
		}

		for _, child := range children {
			childNameByID[child.ID] = child.Name
		}
	}

	result := make([]ChildInfo, 0, len(links))
	for _, l := range links {
		result = append(result, ChildInfo{
			ChildID:   l.ChildID,
			ChildName: childNameByID[l.ChildID],
			LinkedAt:  l.LinkedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"parent_id": parentID,
		"children":  result,
	})
}

// ─────────────────────────────────────────
// CHILD: Get parent linked to child
// GET /api/child/:child_id/parent
// ─────────────────────────────────────────

func GetParentByChild(c *gin.Context) {
	childID := c.Param("child_id")

	var link models.ChildLink
	if err := pairingDB.Where("child_id = ?", childID).First(&link).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No parent linked to this child"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"child_id":  childID,
		"parent_id": link.ParentID,
		"linked_at": link.LinkedAt,
	})
}
