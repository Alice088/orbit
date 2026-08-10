package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type Querier interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type Store struct {
	User   *UserRepo
	Goal   *GoalRepo
	Task   *TaskRepo
	Habit  *HabitRepo
	Streak *StreakRepo
	Event      *EventRepo
	Ledger     *LedgerRepo
	Stats      *StatsRepo
	Experiment *ExperimentRepo
}

func NewStore(q Querier) *Store {
	return &Store{
		User:   NewUserRepo(q),
		Goal:   NewGoalRepo(q),
		Task:   NewTaskRepo(q),
		Habit:  NewHabitRepo(q),
		Streak: NewStreakRepo(q),
		Event:  NewEventRepo(q),
		Ledger:     NewLedgerRepo(q),
		Stats:      NewStatsRepo(q),
		Experiment: NewExperimentRepo(q),
	}
}
