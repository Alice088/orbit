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
		`INSERT INTO goals (user_id, title, total_gpp, status, parent_goal_id)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
		g.UserID, g.Title, g.TotalGPP, g.Status, nullableStringPtr(g.ParentGoalID))
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
		`SELECT id, user_id, title, total_gpp, status, parent_goal_id, created_at, completed_at
		 FROM goals WHERE id = $1`, id)
	var g entity.Goal
	var completedAt *time.Time
	if err := row.Scan(&g.ID, &g.UserID, &g.Title, &g.TotalGPP, &g.Status, &g.ParentGoalID, &g.CreatedAt, &completedAt); err != nil {
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

func (r *GoalRepo) MilestonesByGoalIDs(ctx context.Context, goalIDs []string) ([]entity.Milestone, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, goal_id, percent, reward_points FROM milestones
		 WHERE goal_id = ANY($1::uuid[]) ORDER BY percent`, goalIDs)
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
		`SELECT id, user_id, title, total_gpp, status, parent_goal_id, created_at, completed_at
		 FROM goals WHERE user_id = $1 ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.Goal
	for rows.Next() {
		var g entity.Goal
		var completedAt *time.Time
		if err := rows.Scan(&g.ID, &g.UserID, &g.Title, &g.TotalGPP, &g.Status, &g.ParentGoalID, &g.CreatedAt, &completedAt); err != nil {
			return nil, err
		}
		g.CompletedAt = completedAt
		out = append(out, g)
	}
	return out, rows.Err()
}

func (r *GoalRepo) ParentGoalID(ctx context.Context, id string) (*string, error) {
	var parentID *string
	err := r.q.QueryRow(ctx,
		`SELECT parent_goal_id FROM goals WHERE id = $1`, id).Scan(&parentID)
	return parentID, err
}

func (r *GoalRepo) HasChildren(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := r.q.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM goals WHERE parent_goal_id = $1)`, id).Scan(&exists)
	return exists, err
}

func (r *GoalRepo) ChildIDs(ctx context.Context, parentID string) ([]string, error) {
	rows, err := r.q.Query(ctx, `SELECT id FROM goals WHERE parent_goal_id = $1`, parentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

func (r *GoalRepo) SetParent(ctx context.Context, id string, parentID string) error {
	_, err := r.q.Exec(ctx,
		`UPDATE goals SET parent_goal_id = $2 WHERE id = $1`, id, nullableString(parentID))
	return err
}

func (r *GoalRepo) SetStatus(ctx context.Context, id string, status entity.GoalStatus) error {
	_, err := r.q.Exec(ctx,
		`UPDATE goals SET status = $2, completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE NULL END
		 WHERE id = $1`, id, status)
	return err
}

func (r *GoalRepo) Delete(ctx context.Context, id string) error {
	_, err := r.q.Exec(ctx, `DELETE FROM goals WHERE id = $1`, id)
	return err
}
