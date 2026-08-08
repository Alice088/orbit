package entity

import "time"

type Streak struct {
	UserID          string
	HabitID         string
	CurrentDays     int
	LongestDays     int
	MissesInRow     int
	LastSuccessDate *time.Time
	UpdatedAt       time.Time
}
