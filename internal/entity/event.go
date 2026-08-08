package entity

import "time"

type EventType string

const (
	EventTaskCompleted       EventType = "task_completed"
	EventTaskRegressed       EventType = "task_regressed"
	EventHabitCompleted      EventType = "habit_completed"
	EventGoalCreated         EventType = "goal_created"
	EventGoalReviewed        EventType = "goal_reviewed"
	EventManualCheckIn       EventType = "manual_checkin"
	EventDailySettlement     EventType = "daily_settlement"
	EventInactivityPenalty   EventType = "inactivity_penalty"
	EventAchievementUnlocked EventType = "achievement_unlocked"
)

var ActivityEventTypes = []EventType{
	EventTaskCompleted,
	EventHabitCompleted,
	EventGoalCreated,
	EventGoalReviewed,
	EventManualCheckIn,
}

type DomainEvent struct {
	ID            string
	UserID        string
	EventType     EventType
	AggregateType string
	AggregateID   *string
	Payload       map[string]any
	OccurredAt    time.Time
}
