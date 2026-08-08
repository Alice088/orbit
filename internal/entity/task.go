package entity

import "time"

type TaskStatus string

const (
	TaskStatusOpen      TaskStatus = "open"
	TaskStatusCompleted TaskStatus = "completed"
)

type Task struct {
	ID               string
	UserID           string
	GoalID           string
	MilestoneFromID  string
	MilestoneToID    string
	Title            string
	ContributionCoef int
	Difficulty       string
	Status           TaskStatus
	CreatedAt        time.Time
	CompletedAt      *time.Time
}
