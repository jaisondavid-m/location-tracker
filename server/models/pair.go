package models

import "time"

type PairingCode struct {
	ID        uint      `gorm:"primaryKey"              json:"id"`
	ChildID   uint      `gorm:"not null;index"          json:"child_id"`
	Code      string    `gorm:"size:20;uniqueIndex"     json:"code"`
	ExpiresAt time.Time `gorm:"not null"                json:"expires_at"`
	IsUsed    bool      `gorm:"default:false"           json:"is_used"`
}

func (PairingCode) TableName() string {
	return "pairing_codes"
}

type ChildLink struct {
	ID       uint      `gorm:"primaryKey"                                     json:"id"`
	ParentID uint      `gorm:"not null;index;uniqueIndex:uq_parent_child"    json:"parent_id"`
	ChildID  uint      `gorm:"not null;index;uniqueIndex:uq_parent_child"    json:"child_id"`
	LinkedAt time.Time `gorm:"not null"                                       json:"linked_at"`
}

func (ChildLink) TableName() string {
	return "child_links"
}