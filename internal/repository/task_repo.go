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
		`INSERT INTO tasks (user_id, goal_id, milestone_from_id, milestone_to_id, title, contribution_coef, difficulty, status, gpp_reward)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, created_at`,
		t.UserID, t.GoalID, nullableStringPtr(t.MilestoneFromID), nullableStringPtr(t.MilestoneToID),
		t.Title, t.ContributionCoef, t.Difficulty, t.Status, t.GPPReward)
	return row.Scan(&t.ID, &t.CreatedAt)
}

func (r *TaskRepo) GetByID(ctx context.Context, id string) (*entity.Task, error) {
	row := r.q.QueryRow(ctx,
		`SELECT id, user_id, goal_id, milestone_from_id, milestone_to_id, title, contribution_coef, difficulty, status, created_at, completed_at, gpp_reward
		 FROM tasks WHERE id = $1`, id)
	var t entity.Task
	var completedAt *time.Time
	if err := row.Scan(&t.ID, &t.UserID, &t.GoalID, &t.MilestoneFromID, &t.MilestoneToID,
		&t.Title, &t.ContributionCoef, &t.Difficulty, &t.Status, &t.CreatedAt, &completedAt, &t.GPPReward); err != nil {
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

func (r *TaskRepo) Delete(ctx context.Context, id string) error {
	_, err := r.q.Exec(ctx, `DELETE FROM tasks WHERE id = $1`, id)
	return err
}

func (r *TaskRepo) DeleteByGoal(ctx context.Context, goalID string) error {
	_, err := r.q.Exec(ctx, `DELETE FROM tasks WHERE goal_id = $1`, goalID)
	return err
}

func (r *TaskRepo) ListByUser(ctx context.Context, userID string) ([]entity.Task, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, user_id, goal_id, milestone_from_id, milestone_to_id, title, contribution_coef, difficulty, status, created_at, completed_at, gpp_reward
		 FROM tasks WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.Task
	for rows.Next() {
		var t entity.Task
		var completedAt *time.Time
		if err := rows.Scan(&t.ID, &t.UserID, &t.GoalID, &t.MilestoneFromID, &t.MilestoneToID,
			&t.Title, &t.ContributionCoef, &t.Difficulty, &t.Status, &t.CreatedAt, &completedAt, &t.GPPReward); err != nil {
			return nil, err
		}
		t.CompletedAt = completedAt
		out = append(out, t)
	}
	return out, rows.Err()
}
