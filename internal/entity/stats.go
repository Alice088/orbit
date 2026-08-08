package entity

import "time"

type DaySettlement struct {
	UserID    string
	Day       time.Time
	SettledAt time.Time
}

type DailyStats struct {
	UserID          string
	Day             time.Time
	XPEarned        int
	HabitXP         int
	TaskXP          int
	PenaltyXP       int
	GPPEarned       int
	TasksCompleted  int
	HabitsCompleted int
}

type Achievement struct {
	ID         string
	UserID     string
	Code       string
	UnlockedAt time.Time
}
