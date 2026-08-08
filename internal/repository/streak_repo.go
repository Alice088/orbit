package repository

import (
	"context"
	"errors"
	"orbit/internal/entity"

	"github.com/jackc/pgx/v5"
)

type StreakRepo struct {
	q Querier
}

func NewStreakRepo(q Querier) *StreakRepo {
	return &StreakRepo{q: q}
}

func (r *StreakRepo) Get(ctx context.Context, userID string, habitID string) (*entity.Streak, error) {
	row := r.q.QueryRow(ctx,
		`SELECT user_id, habit_id, current_days, longest_days, misses_in_row, last_success_date, updated_at
		 FROM streaks WHERE user_id = $1 AND habit_id = $2`, userID, habitID)
	var s entity.Streak
	if err := row.Scan(&s.UserID, &s.HabitID, &s.CurrentDays, &s.LongestDays, &s.MissesInRow, &s.LastSuccessDate, &s.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *StreakRepo) Upsert(ctx context.Context, s *entity.Streak) error {
	_, err := r.q.Exec(ctx,
		`INSERT INTO streaks (user_id, habit_id, current_days, longest_days, misses_in_row, last_success_date, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, now())
		 ON CONFLICT (user_id, habit_id) DO UPDATE SET
		   current_days = EXCLUDED.current_days,
		   longest_days = EXCLUDED.longest_days,
		   misses_in_row = EXCLUDED.misses_in_row,
		   last_success_date = EXCLUDED.last_success_date,
		   updated_at = now()`,
		s.UserID, s.HabitID, s.CurrentDays, s.LongestDays, s.MissesInRow, nullableTime(s.LastSuccessDate))
	return err
}

func (r *StreakRepo) ListByUser(ctx context.Context, userID string) ([]entity.Streak, error) {
	rows, err := r.q.Query(ctx,
		`SELECT user_id, habit_id, current_days, longest_days, misses_in_row, last_success_date, updated_at
		 FROM streaks WHERE user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.Streak
	for rows.Next() {
		var s entity.Streak
		if err := rows.Scan(&s.UserID, &s.HabitID, &s.CurrentDays, &s.LongestDays, &s.MissesInRow, &s.LastSuccessDate, &s.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}
