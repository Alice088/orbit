package penalty

import "orbit/internal/entity"

const (
	ReasonMissedTwice = "habit_missed_twice"
	ReasonInactivity  = "inactivity"
	ReasonRegression  = "task_regression"
)

type Penalty struct {
	UserID   string
	Currency entity.Currency
	Amount   int
	Reason   string
	GoalID   *string
}
