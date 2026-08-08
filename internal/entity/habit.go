package entity

import "time"

type Habit struct {
	ID               string
	UserID           string
	Title            string
	BaseXP           int
	StreakTracking   bool
	Category         string
	CreatedAt        time.Time
	StreakMilestones []StreakMilestone
}

type StreakMilestone struct {
	ID              string
	HabitID         string
	Days            int
	BonusXP         int
	AchievementCode string
}
