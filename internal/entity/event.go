package entity

import "time"

type EventType string

const (
	EventTaskCompleted       EventType = "task_completed"
	EventTaskRegressed       EventType = "task_regressed"
	EventTaskDeleted         EventType = "task_deleted"
	EventManualPenalty       EventType = "manual_penalty"
	EventHabitCompleted      EventType = "habit_completed"
	EventHabitDeleted        EventType = "habit_deleted"
	EventGoalCreated         EventType = "goal_created"
	EventGoalReviewed        EventType = "goal_reviewed"
	EventGoalDeleted         EventType = "goal_deleted"
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
	EventManualPenalty,
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
