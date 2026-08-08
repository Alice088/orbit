package repository

import (
	"context"
	"orbit/internal/entity"
	"time"
)

type StatsRepo struct {
	q Querier
}

func NewStatsRepo(q Querier) *StatsRepo {
	return &StatsRepo{q: q}
}

func (r *StatsRepo) UpsertDailyStats(ctx context.Context, s *entity.DailyStats) error {
	_, err := r.q.Exec(ctx,
		`INSERT INTO daily_stats (user_id, day, xp_earned, habit_xp, task_xp, penalty_xp, gpp_earned, tasks_completed, habits_completed)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 ON CONFLICT (user_id, day) DO UPDATE SET
		   xp_earned = daily_stats.xp_earned + EXCLUDED.xp_earned,
		   habit_xp = daily_stats.habit_xp + EXCLUDED.habit_xp,
		   task_xp = daily_stats.task_xp + EXCLUDED.task_xp,
		   penalty_xp = daily_stats.penalty_xp + EXCLUDED.penalty_xp,
		   gpp_earned = daily_stats.gpp_earned + EXCLUDED.gpp_earned,
		   tasks_completed = daily_stats.tasks_completed + EXCLUDED.tasks_completed,
		   habits_completed = daily_stats.habits_completed + EXCLUDED.habits_completed`,
		s.UserID, s.Day.Format("2006-01-02"), s.XPEarned, s.HabitXP, s.TaskXP,
		s.PenaltyXP, s.GPPEarned, s.TasksCompleted, s.HabitsCompleted)
	return err
}

func (r *StatsRepo) GetDailyStats(ctx context.Context, userID string, day string) (*entity.DailyStats, error) {
	row := r.q.QueryRow(ctx,
		`SELECT user_id, day, xp_earned, habit_xp, task_xp, penalty_xp, gpp_earned, tasks_completed, habits_completed
		 FROM daily_stats WHERE user_id = $1 AND day = $2`, userID, day)
	var s entity.DailyStats
	if err := row.Scan(&s.UserID, &s.Day, &s.XPEarned, &s.HabitXP, &s.TaskXP, &s.PenaltyXP,
		&s.GPPEarned, &s.TasksCompleted, &s.HabitsCompleted); err != nil {
		if isNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *StatsRepo) StatsRange(ctx context.Context, userID string, from string, to string) ([]entity.DailyStats, error) {
	rows, err := r.q.Query(ctx,
		`SELECT user_id, day, xp_earned, habit_xp, task_xp, penalty_xp, gpp_earned, tasks_completed, habits_completed
		 FROM daily_stats WHERE user_id = $1 AND day >= $2 AND day <= $3 ORDER BY day`, userID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.DailyStats
	for rows.Next() {
		var s entity.DailyStats
		if err := rows.Scan(&s.UserID, &s.Day, &s.XPEarned, &s.HabitXP, &s.TaskXP, &s.PenaltyXP,
			&s.GPPEarned, &s.TasksCompleted, &s.HabitsCompleted); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *StatsRepo) InsertSettlementIfAbsent(ctx context.Context, userID string, day string) (bool, error) {
	tag, err := r.q.Exec(ctx,
		`INSERT INTO day_settlements (user_id, day) VALUES ($1, $2) ON CONFLICT DO NOTHING`, userID, day)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *StatsRepo) LastSettledDay(ctx context.Context, userID string) (*time.Time, error) {
	row := r.q.QueryRow(ctx,
		`SELECT max(day) FROM day_settlements WHERE user_id = $1`, userID)
	var day *time.Time
	if err := row.Scan(&day); err != nil {
		return nil, err
	}
	return day, nil
}

func (r *StatsRepo) UnlockAchievementIfAbsent(ctx context.Context, userID string, code string) (bool, error) {
	tag, err := r.q.Exec(ctx,
		`INSERT INTO achievements (user_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING`, userID, code)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *StatsRepo) ListAchievements(ctx context.Context, userID string) ([]entity.Achievement, error) {
	rows, err := r.q.Query(ctx,
		`SELECT id, user_id, code, unlocked_at FROM achievements
		 WHERE user_id = $1 ORDER BY unlocked_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []entity.Achievement
	for rows.Next() {
		var a entity.Achievement
		if err := rows.Scan(&a.ID, &a.UserID, &a.Code, &a.UnlockedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

type CategoryXP struct {
	Category string
	XP       int
}

func (r *StatsRepo) HabitXPByCategory(ctx context.Context, userID string, from, to string) ([]CategoryXP, error) {
	rows, err := r.q.Query(ctx,
		`SELECT COALESCE(h.category, ''), COALESCE(sum(pt.amount), 0)
		 FROM point_transactions pt
		 JOIN domain_events ev ON pt.domain_event_id = ev.id
		 JOIN habits h ON ev.aggregate_id = h.id
		 WHERE pt.user_id = $1 AND pt.currency = 'xp' AND ev.event_type = 'habit_completed'
		   AND pt.created_at::date >= $2 AND pt.created_at::date <= $3
		 GROUP BY h.category ORDER BY 2 DESC`, userID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CategoryXP
	for rows.Next() {
		var c CategoryXP
		if err := rows.Scan(&c.Category, &c.XP); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *StatsRepo) TaskXPInRange(ctx context.Context, userID string, from, to string) (int, error) {
	var sum int
	err := r.q.QueryRow(ctx,
		`SELECT COALESCE(sum(amount), 0) FROM point_transactions
		 WHERE user_id = $1 AND currency = 'xp' AND reason = 'task_completed'
		   AND created_at::date >= $2 AND created_at::date <= $3`, userID, from, to).Scan(&sum)
	return sum, err
}
