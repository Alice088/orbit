package repository

import (
	"context"
	"errors"
	"orbit/internal/entity"
	"time"

	"github.com/jackc/pgx/v5"
)

type GoalRepo struct {
	q Querier
}

func NewGoalRepo(q Querier) *GoalRepo {
	return &GoalRepo{q: q}
}

func (r *GoalRepo) Create(ctx context.Context, g *entity.Goal) error {
	row := r.q.QueryRow(ctx,
		`INSERT INTO goals (user_id, title, total_gpp, status)
		 VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
		g.UserID, g.Title, g.TotalGPP, g.Status)
	return row.Scan(&g.ID, &g.CreatedAt)
}

func (r *GoalRepo) CreateMilestone(ctx context.Context, m *entity.Milestone) error {
	row := r.q.QueryRow(ctx,
		`INSERT INTO milestones (goal_id, percent, reward_points)
		 VALUES ($1, $2, $3) RETURNING id`,
		m.GoalID, m.Percent, m.RewardPoints)
	return row.Scan(&m.ID)
}

func (r *GoalRepo) GetByID(ctx context.Context, id string) (*entity.Goal, error) {
	row := r.q.QueryRow(ctx,
		`SELECT id, user_id, title, total_gpp, status, created_at, completed_at
		 FROM goals WHERE id = $1`, id)
	var g entity.Goal
	var completedAt *time.Time
	if err := row.Scan(&g.ID, &g.UserID, &g.Title, &g.TotalGPP, &g.Status, &g.CreatedAt, &completedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	g.CompletedAt = completedAt
	return &g, nil
}

func (r *GoalRepo) Milestones(ctx context.Context, goalID string) ([]entity.Milestone, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, goal_id, percent, reward_points FROM milestones
		 WHERE goal_id = $1 ORDER BY percent`, goalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.Milestone
	for rows.Next() {
		var m entity.Milestone
		if err := rows.Scan(&m.ID, &m.GoalID, &m.Percent, &m.RewardPoints); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (r *GoalRepo) MilestoneByID(ctx context.Context, id string) (*entity.Milestone, error) {
	row := r.q.QueryRow(ctx,
		`SELECT id, goal_id, percent, reward_points FROM milestones WHERE id = $1`, id)
	var m entity.Milestone
	if err := row.Scan(&m.ID, &m.GoalID, &m.Percent, &m.RewardPoints); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &m, nil
}

func (r *GoalRepo) ListByUser(ctx context.Context, userID string) ([]entity.Goal, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, user_id, title, total_gpp, status, created_at, completed_at
		 FROM goals WHERE user_id = $1 ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.Goal
	for rows.Next() {
		var g entity.Goal
		var completedAt *time.Time
		if err := rows.Scan(&g.ID, &g.UserID, &g.Title, &g.TotalGPP, &g.Status, &g.CreatedAt, &completedAt); err != nil {
			return nil, err
		}
		g.CompletedAt = completedAt
		out = append(out, g)
	}
	return out, rows.Err()
}

func (r *GoalRepo) SetStatus(ctx context.Context, id string, status entity.GoalStatus) error {
	_, err := r.q.Exec(ctx,
		`UPDATE goals SET status = $2, completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE NULL END
		 WHERE id = $1`, id, status)
	return err
}
