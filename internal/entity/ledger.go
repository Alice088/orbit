package entity

import "time"

type Currency string

const (
	CurrencyGPP Currency = "gpp"
	CurrencyXP  Currency = "xp"
)

type PointTransaction struct {
	ID            string
	UserID        string
	Currency      Currency
	Amount        int
	Reason        string
	GoalID        *string
	SourceGoalID  *string
	DomainEventID *string
	CreatedAt     time.Time
}
