package repository

import (
	"context"
	"errors"
	"orbit/internal/entity"
	"time"

	"github.com/jackc/pgx/v5"
)

type HabitRepo struct {
	q Querier
}

func NewHabitRepo(q Querier) *HabitRepo {
	return &HabitRepo{q: q}
}

func (r *HabitRepo) Create(ctx context.Context, h *entity.Habit) error {
	row := r.q.QueryRow(ctx,
		`INSERT INTO habits (user_id, title, base_xp, streak_tracking, category)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
		h.UserID, h.Title, h.BaseXP, h.StreakTracking, h.Category)
	return row.Scan(&h.ID, &h.CreatedAt)
}

func (r *HabitRepo) CreateMilestone(ctx context.Context, m *entity.StreakMilestone) error {
	row := r.q.QueryRow(ctx,
		`INSERT INTO habit_streak_milestones (habit_id, days, bonus_xp, achievement_code)
		 VALUES ($1, $2, $3, $4) RETURNING id`,
		m.HabitID, m.Days, m.BonusXP, nullableString(m.AchievementCode))
	return row.Scan(&m.ID)
}

func (r *HabitRepo) GetByID(ctx context.Context, id string) (*entity.Habit, error) {
	row := r.q.QueryRow(ctx,
		`SELECT id, user_id, title, base_xp, streak_tracking, category, created_at, last_completed_at
		 FROM habits WHERE id = $1`, id)
	var h entity.Habit
	if err := row.Scan(&h.ID, &h.UserID, &h.Title, &h.BaseXP, &h.StreakTracking, &h.Category, &h.CreatedAt, &h.LastCompletedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	milestones, err := r.StreakMilestones(ctx, id)
	if err != nil {
		return nil, err
	}
	h.StreakMilestones = milestones
	return &h, nil
}

func (r *HabitRepo) StreakMilestones(ctx context.Context, habitID string) ([]entity.StreakMilestone, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, habit_id, days, bonus_xp, achievement_code FROM habit_streak_milestones
		 WHERE habit_id = $1 ORDER BY days`, habitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.StreakMilestone
	for rows.Next() {
		var m entity.StreakMilestone
		var code *string
		if err := rows.Scan(&m.ID, &m.HabitID, &m.Days, &m.BonusXP, &code); err != nil {
			return nil, err
		}
		if code != nil {
			m.AchievementCode = *code
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (r *HabitRepo) ListByUser(ctx context.Context, userID string) ([]entity.Habit, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, user_id, title, base_xp, streak_tracking, category, created_at, last_completed_at
		 FROM habits WHERE user_id = $1 ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.Habit
	for rows.Next() {
		var h entity.Habit
		if err := rows.Scan(&h.ID, &h.UserID, &h.Title, &h.BaseXP, &h.StreakTracking, &h.Category, &h.CreatedAt, &h.LastCompletedAt); err != nil {
			return nil, err
		}
		ms, err := r.StreakMilestones(ctx, h.ID)
		if err != nil {
			return nil, err
		}
		h.StreakMilestones = ms
		out = append(out, h)
	}
	return out, rows.Err()
}

func (r *HabitRepo) SetLastCompleted(ctx context.Context, id string, t time.Time) error {
	_, err := r.q.Exec(ctx, `UPDATE habits SET last_completed_at = $1 WHERE id = $2`, t, id)
	return err
}

func (r *HabitRepo) MaxMilestoneLevel(ctx context.Context, userID string, habitID string, milestoneIdx int) (int, error) {
	var level int
	err := r.q.QueryRow(ctx,
		`SELECT COALESCE(MAX(level), 0) FROM habit_milestone_clears
		 WHERE user_id = $1 AND habit_id = $2 AND milestone_idx = $3`, userID, habitID, milestoneIdx).Scan(&level)
	return level, err
}

func (r *HabitRepo) InsertMilestoneClear(ctx context.Context, userID string, habitID string, milestoneIdx int, level int, bonusXP int) (bool, error) {
	tag, err := r.q.Exec(ctx,
		`INSERT INTO habit_milestone_clears (user_id, habit_id, milestone_idx, level, bonus_xp)
		 VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`, userID, habitID, milestoneIdx, level, bonusXP)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *HabitRepo) Delete(ctx context.Context, id string) error {
	_, err := r.q.Exec(ctx, `DELETE FROM habits WHERE id = $1`, id)
	return err
}
