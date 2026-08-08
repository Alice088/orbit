package entity

import "time"

type GoalStatus string

const (
	GoalStatusActive    GoalStatus = "active"
	GoalStatusCompleted GoalStatus = "completed"
	GoalStatusArchived  GoalStatus = "archived"
)

type Goal struct {
	ID          string
	UserID      string
	Title       string
	TotalGPP    int
	Status      GoalStatus
	CreatedAt   time.Time
	CompletedAt *time.Time
}

type Milestone struct {
	ID           string
	GoalID       string
	Percent      int
	RewardPoints int
}
