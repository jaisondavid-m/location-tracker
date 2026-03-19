package models

import "time"

type Location struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	ChildID    uint      `gorm:"not null;index"           json:"child_id"`
	Latitude   float64   `gorm:"not null"                 json:"latitude"`
	Longitude  float64   `gorm:"not null"                 json:"longitude"`
	Accuracy   float64   `                                json:"accuracy"`   
	Speed      float64   `                                json:"speed"`   
	RecordedAt time.Time `gorm:"not null;index"           json:"recorded_at"`
}