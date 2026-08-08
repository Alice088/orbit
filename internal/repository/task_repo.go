package repository

import (
	"context"
	"errors"
	"orbit/internal/entity"
	"time"

	"github.com/jackc/pgx/v5"
)

type TaskRepo struct {
	q Querier
}

func NewTaskRepo(q Querier) *TaskRepo {
	return &TaskRepo{q: q}
}

func (r *TaskRepo) Create(ctx context.Context, t *entity.Task) error {
	row := r.q.QueryRow(ctx,
		`INSERT INTO tasks (user_id, goal_id, milestone_from_id, milestone_to_id, title, contribution_coef, difficulty, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, created_at`,
		t.UserID, t.GoalID, t.MilestoneFromID, t.MilestoneToID, t.Title, t.ContributionCoef, t.Difficulty, t.Status)
	return row.Scan(&t.ID, &t.CreatedAt)
}

func (r *TaskRepo) GetByID(ctx context.Context, id string) (*entity.Task, error) {
	row := r.q.QueryRow(ctx,
		`SELECT id, user_id, goal_id, milestone_from_id, milestone_to_id, title, contribution_coef, difficulty, status, created_at, completed_at
		 FROM tasks WHERE id = $1`, id)
	var t entity.Task
	var completedAt *time.Time
	if err := row.Scan(&t.ID, &t.UserID, &t.GoalID, &t.MilestoneFromID, &t.MilestoneToID,
		&t.Title, &t.ContributionCoef, &t.Difficulty, &t.Status, &t.CreatedAt, &completedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	t.CompletedAt = completedAt
	return &t, nil
}

func (r *TaskRepo) SetCompleted(ctx context.Context, id string, at time.Time) error {
	_, err := r.q.Exec(ctx,
		`UPDATE tasks SET status = 'completed', completed_at = $2 WHERE id = $1`, id, at)
	return err
}
