package service

import (
	"context"
	"errors"
	"fmt"
	"orbit/internal/engine/economy"
	"orbit/internal/engine/level"
	"orbit/internal/engine/penalty"
	"orbit/internal/engine/progress"
	"orbit/internal/engine/scoring"
	"orbit/internal/engine/streak"
	"orbit/internal/entity"
	"orbit/internal/repository"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrValidation     = errors.New("validation failed")
	ErrTaskCompleted  = errors.New("task already completed")
	ErrWrongOwner     = errors.New("resource belongs to another user")
	ErrInactiveGoal   = errors.New("goal is not active")
	ErrAccountNotFound = errors.New("аккаунт с таким именем не найден")
	ErrHabitDoneToday = errors.New("привычка уже выполнена сегодня")
)

const maxMilestoneRepeatLevel = 99999999

type GameSettings struct {
	Timezone             string
	DailyHabitCap        int
	MissedTwicePenaltyXP int
	InactivityPenaltyXP  int
}

type Service struct {
	pool *pgxpool.Pool
	cfg  GameSettings
	loc  *time.Location
}

func NewService(pool *pgxpool.Pool, cfg GameSettings) (*Service, error) {
	loc, err := time.LoadLocation(cfg.Timezone)
	if err != nil {
		return nil, err
	}
	return &Service{pool: pool, cfg: cfg, loc: loc}, nil
}

type StreakMilestoneInput struct {
	Days            int
	BonusXP         int
	AchievementCode string
}

type Completion struct {
	GPP             int
	XP              int
	BonusXP         int
	StreakDays      int
	AchievementCode string
}

type LevelInfo struct {
	XP        int
	LevelName string
	LevelIdx  int
	NextXP    *int
}

type GoalProgress struct {
	Goal      entity.Goal
	EarnedGPP int
	Percent   int
}

type DailySummary struct {
	Day             string
	XPEarned        int
	HabitXP         int
	TaskXP          int
	PenaltyXP       int
	GPPEarned       int
	TasksCompleted  int
	HabitsCompleted int
}

type WeekSummary struct {
	Days                []DailySummary
	TotalXP             int
	AvgDailyXP          int
	SuggestedWeeklyGoal int
}

type CategoryStat struct {
	Category string
	XP       int
}

type Transaction struct {
	ID            string
	Currency      entity.Currency
	Amount        int
	Reason        string
	GoalID        *string
	GoalTitle     string
	SourceTitle   string
	DomainEventID *string
	CreatedAt     time.Time
}

type Analytics struct {
	Week                  WeekSummary
	HabitByCategory       []CategoryStat
	TaskXPLastWeek        int
	RoutineStrategicRatio float64
}

func (s *Service) withTx(ctx context.Context, fn func(tx pgx.Tx) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Service) today() time.Time {
	return s.dayOf(time.Now())
}

func (s *Service) dayOf(t time.Time) time.Time {
	t = t.In(s.loc)
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

func dayKey(t time.Time) string {
	return t.Format("2006-01-02")
}

var goalMilestonePercents = []int{1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100}

func (s *Service) CreateGoal(ctx context.Context, userID string, title string, totalGPP int) (*entity.Goal, error) {
	if totalGPP <= 0 {
		return nil, ErrValidation
	}
	var goal *entity.Goal
	err := s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		g := &entity.Goal{UserID: userID, Title: title, TotalGPP: totalGPP, Status: entity.GoalStatusActive}
		if err := store.Goal.Create(ctx, g); err != nil {
			return err
		}
		for _, pct := range goalMilestonePercents {
			ms := &entity.Milestone{GoalID: g.ID, Percent: pct, RewardPoints: (totalGPP*pct + 50) / 100}
			if err := store.Goal.CreateMilestone(ctx, ms); err != nil {
				return err
			}
		}
		ev := &entity.DomainEvent{
			UserID: userID, EventType: entity.EventGoalCreated,
			AggregateType: "goal", AggregateID: &g.ID,
			Payload: map[string]any{"title": title, "total_gpp": totalGPP},
		}
		if err := store.Event.Insert(ctx, ev); err != nil {
			return err
		}
		goal = g
		return nil
	})
	return goal, err
}

func (s *Service) CreateTask(ctx context.Context, userID string, goalID string, title string, gppReward int, difficulty string) (*entity.Task, error) {
	if gppReward < 1 || gppReward > 10000 {
		return nil, ErrValidation
	}
	if difficulty != "easy" && difficulty != "normal" && difficulty != "hard" && difficulty != "epic" {
		difficulty = "normal"
	}
	var task *entity.Task
	err := s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		goal, err := store.Goal.GetByID(ctx, goalID)
		if err != nil {
			return err
		}
		if goal.UserID != userID {
			return ErrWrongOwner
		}
		if goal.Status != entity.GoalStatusActive {
			return ErrInactiveGoal
		}
		t := &entity.Task{
			UserID: userID, GoalID: goalID, Title: title,
			GPPReward: gppReward, Difficulty: difficulty, Status: entity.TaskStatusOpen,
		}
		if err := store.Task.Create(ctx, t); err != nil {
			return err
		}
		task = t
		return nil
	})
	return task, err
}

func (s *Service) CompleteTask(ctx context.Context, userID string, taskID string) (*Completion, error) {
	var result *Completion
	err := s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		task, err := store.Task.GetByID(ctx, taskID)
		if err != nil {
			return err
		}
		if task.UserID != userID {
			return ErrWrongOwner
		}
		if task.Status == entity.TaskStatusCompleted {
			return ErrTaskCompleted
		}
		gpp := task.GPPReward
		if gpp == 0 && task.MilestoneFromID != nil && task.MilestoneToID != nil {
			from, err := store.Goal.MilestoneByID(ctx, *task.MilestoneFromID)
			if err != nil {
				return err
			}
			to, err := store.Goal.MilestoneByID(ctx, *task.MilestoneToID)
			if err != nil {
				return err
			}
			gpp = scoring.GPP(to.RewardPoints, from.RewardPoints, task.ContributionCoef)
		}
		xp := scoring.TaskXP(gpp, task.Difficulty)
		ev := &entity.DomainEvent{
			UserID: userID, EventType: entity.EventTaskCompleted,
			AggregateType: "task", AggregateID: &task.ID,
			Payload: map[string]any{"title": task.Title, "goal_id": task.GoalID, "gpp": gpp, "xp": xp},
		}
		if err := store.Event.Insert(ctx, ev); err != nil {
			return err
		}
		if gpp > 0 {
			if err := store.Ledger.Insert(ctx, &entity.PointTransaction{
				UserID: userID, Currency: entity.CurrencyGPP, Amount: gpp,
				Reason: "task_completed", GoalID: &task.GoalID, DomainEventID: &ev.ID,
			}); err != nil {
				return err
			}
		}
		if xp > 0 {
			if err := store.Ledger.Insert(ctx, &entity.PointTransaction{
				UserID: userID, Currency: entity.CurrencyXP, Amount: xp,
				Reason: "task_completed", DomainEventID: &ev.ID,
			}); err != nil {
				return err
			}
		}
		if err := store.Task.SetCompleted(ctx, task.ID, time.Now()); err != nil {
			return err
		}
		stats := &entity.DailyStats{
			UserID: userID, Day: s.today(), XPEarned: xp, TaskXP: xp, GPPEarned: gpp, TasksCompleted: 1,
		}
		if err := store.Stats.UpsertDailyStats(ctx, stats); err != nil {
			return err
		}
		result = &Completion{GPP: gpp, XP: xp}
		return nil
	})
	return result, err
}

func (s *Service) CreateHabit(ctx context.Context, userID string, title string, baseXP int, streakTracking bool, category string, milestones []StreakMilestoneInput) (*entity.Habit, error) {
	if baseXP <= 0 {
		return nil, ErrValidation
	}
	for i, m := range milestones {
		if m.Days <= 0 || m.BonusXP <= 0 {
			return nil, ErrValidation
		}
		if i > 0 && m.Days <= milestones[i-1].Days {
			return nil, ErrValidation
		}
	}
	var habit *entity.Habit
	err := s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		h := &entity.Habit{
			UserID: userID, Title: title, BaseXP: baseXP,
			StreakTracking: streakTracking, Category: category,
		}
		if err := store.Habit.Create(ctx, h); err != nil {
			return err
		}
		for _, m := range milestones {
			ms := &entity.StreakMilestone{
				HabitID: h.ID, Days: m.Days, BonusXP: m.BonusXP, AchievementCode: m.AchievementCode,
			}
			if err := store.Habit.CreateMilestone(ctx, ms); err != nil {
				return err
			}
		}
		habit = h
		return nil
	})
	return habit, err
}

func (s *Service) CompleteHabit(ctx context.Context, userID string, habitID string) (*Completion, error) {
	var result *Completion
	err := s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		habit, err := store.Habit.GetByID(ctx, habitID)
		if err != nil {
			return err
		}
		if habit.UserID != userID {
			return ErrWrongOwner
		}
		if habit.LastCompletedAt != nil && s.dayOf(*habit.LastCompletedAt).Equal(s.today()) {
			return ErrHabitDoneToday
		}
		state := streak.State{}
		if habit.StreakTracking {
			st, err := store.Streak.Get(ctx, userID, habitID)
			if err != nil {
				return err
			}
			if st != nil {
				state = streak.State{
					CurrentDays: st.CurrentDays, LongestDays: st.LongestDays,
					MissesInRow: st.MissesInRow, LastSuccessDate: st.LastSuccessDate,
				}
			}
			state = streak.OnSuccess(state, s.today())
			if err := store.Streak.Upsert(ctx, &entity.Streak{
				UserID: userID, HabitID: habitID, CurrentDays: state.CurrentDays,
				LongestDays: state.LongestDays, MissesInRow: state.MissesInRow,
				LastSuccessDate: state.LastSuccessDate,
			}); err != nil {
				return err
			}
		}
		bonus := 0
		achievementCode := ""
		if habit.StreakTracking {
			for i, m := range habit.StreakMilestones {
				level, err := store.Habit.MaxMilestoneLevel(ctx, userID, habitID, i)
				if err != nil {
					return err
				}
				next := level + 1
				if next >= maxMilestoneRepeatLevel {
					if err := store.Habit.Delete(ctx, habitID); err != nil {
						return err
					}
					break
				}
				if state.CurrentDays < streak.ScaledThreshold(m.Days, next) {
					continue
				}
				scaled := streak.ScaledThreshold(m.BonusXP, next)
				cleared, err := store.Habit.InsertMilestoneClear(ctx, userID, habitID, i, next, scaled)
				if err != nil {
					return err
				}
				if !cleared {
					continue
				}
				bonus += scaled
				code := m.AchievementCode
				if next > 1 {
					code = fmt.Sprintf("%s урв.%d", habit.Title, next)
				}
				unlocked, err := store.Stats.UnlockAchievementIfAbsent(ctx, userID, code)
				if err != nil {
					return err
				}
				if unlocked {
					achievementCode = code
				}
			}
		}
		daily, err := store.Stats.GetDailyStats(ctx, userID, dayKey(s.today()))
		if err != nil {
			return err
		}
		dailyHabitXP := 0
		if daily != nil {
			dailyHabitXP = daily.HabitXP
		}
		baseAwarded, bonusAwarded := economy.HabitXPCap(dailyHabitXP, habit.BaseXP, bonus, s.cfg.DailyHabitCap)
		ev := &entity.DomainEvent{
			UserID: userID, EventType: entity.EventHabitCompleted,
			AggregateType: "habit", AggregateID: &habitID,
			Payload: map[string]any{
				"title": habit.Title, "base_xp": habit.BaseXP, "bonus_xp": bonus, "awarded": baseAwarded + bonusAwarded,
				"streak_days": state.CurrentDays,
			},
		}
		if err := store.Event.Insert(ctx, ev); err != nil {
			return err
		}
		if baseAwarded > 0 {
			if err := store.Ledger.Insert(ctx, &entity.PointTransaction{
				UserID: userID, Currency: entity.CurrencyXP, Amount: baseAwarded,
				Reason: "habit_completed", DomainEventID: &ev.ID,
			}); err != nil {
				return err
			}
		}
		if bonusAwarded > 0 {
			if err := store.Ledger.Insert(ctx, &entity.PointTransaction{
				UserID: userID, Currency: entity.CurrencyXP, Amount: bonusAwarded,
				Reason: "streak_milestone", DomainEventID: &ev.ID,
			}); err != nil {
				return err
			}
		}
		stats := &entity.DailyStats{
			UserID: userID, Day: s.today(), XPEarned: baseAwarded + bonusAwarded,
			HabitXP: baseAwarded + bonusAwarded, HabitsCompleted: 1,
		}
		if err := store.Stats.UpsertDailyStats(ctx, stats); err != nil {
			return err
		}
		if achievementCode != "" {
			unlocked, err := store.Stats.UnlockAchievementIfAbsent(ctx, userID, achievementCode)
			if err != nil {
				return err
			}
			if unlocked {
				evA := &entity.DomainEvent{
					UserID: userID, EventType: entity.EventAchievementUnlocked,
					AggregateType: "achievement", AggregateID: &habitID,
					Payload: map[string]any{"habit_id": habitID, "code": achievementCode},
				}
				if err := store.Event.Insert(ctx, evA); err != nil {
					return err
				}
			}
		}
		result = &Completion{
			XP: baseAwarded + bonusAwarded, BonusXP: bonusAwarded,
			StreakDays: state.CurrentDays, AchievementCode: achievementCode,
		}
		return store.Habit.SetLastCompleted(ctx, habitID, time.Now())
	})
	return result, err
}

func (s *Service) ReviewGoal(ctx context.Context, userID string, goalID string) error {
	return s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		goal, err := store.Goal.GetByID(ctx, goalID)
		if err != nil {
			return err
		}
		if goal.UserID != userID {
			return ErrWrongOwner
		}
		ev := &entity.DomainEvent{
			UserID: userID, EventType: entity.EventGoalReviewed,
			AggregateType: "goal", AggregateID: &goalID,
			Payload: map[string]any{},
		}
		return store.Event.Insert(ctx, ev)
	})
}

func (s *Service) CheckIn(ctx context.Context, userID string, mood string) error {
	return s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		ev := &entity.DomainEvent{
			UserID: userID, EventType: entity.EventManualCheckIn,
			AggregateType: "user", Payload: map[string]any{"mood": mood},
		}
		return store.Event.Insert(ctx, ev)
	})
}

func (s *Service) SettleDay(ctx context.Context, userID string, day time.Time) error {
	day = s.dayOf(day)
	return s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		inserted, err := store.Stats.InsertSettlementIfAbsent(ctx, userID, dayKey(day))
		if err != nil {
			return err
		}
		if !inserted {
			return nil
		}
		habits, err := store.Habit.ListByUser(ctx, userID)
		if err != nil {
			return err
		}
		penaltyStats := &entity.DailyStats{UserID: userID, Day: day}
		for _, h := range habits {
			if !h.StreakTracking {
				continue
			}
			st, err := store.Streak.Get(ctx, userID, h.ID)
			if err != nil {
				return err
			}
			state := streak.State{}
			if st != nil {
				state = streak.State{
					CurrentDays: st.CurrentDays, LongestDays: st.LongestDays,
					MissesInRow: st.MissesInRow, LastSuccessDate: st.LastSuccessDate,
				}
			}
			res := streak.OnMiss(state, day)
			if res.PenaltyNeeded {
				ev := &entity.DomainEvent{
					UserID: userID, EventType: entity.EventDailySettlement,
					AggregateType: "habit", AggregateID: &h.ID,
					Payload: map[string]any{"penalty": penalty.ReasonMissedTwice},
				}
				if err := store.Event.Insert(ctx, ev); err != nil {
					return err
				}
				if err := store.Ledger.Insert(ctx, &entity.PointTransaction{
					UserID: userID, Currency: entity.CurrencyXP, Amount: -s.cfg.MissedTwicePenaltyXP,
					Reason: penalty.ReasonMissedTwice, DomainEventID: &ev.ID,
				}); err != nil {
					return err
				}
				penaltyStats.PenaltyXP += -s.cfg.MissedTwicePenaltyXP
				penaltyStats.XPEarned += -s.cfg.MissedTwicePenaltyXP
			}
			if err := store.Streak.Upsert(ctx, &entity.Streak{
				UserID: userID, HabitID: h.ID, CurrentDays: res.State.CurrentDays,
				LongestDays: res.State.LongestDays, MissesInRow: res.State.MissesInRow,
				LastSuccessDate: res.State.LastSuccessDate,
			}); err != nil {
				return err
			}
		}
		last, err := store.Event.LastUserActivity(ctx, userID, entity.ActivityEventTypes)
		if err != nil {
			return err
		}
		if last != nil {
			inactive := int(day.Sub(s.dayOf(*last)).Hours() / 24)
			if inactive == 2 {
				ev := &entity.DomainEvent{
					UserID: userID, EventType: entity.EventInactivityPenalty,
					AggregateType: "user",
					Payload:       map[string]any{"penalty": penalty.ReasonInactivity},
				}
				if err := store.Event.Insert(ctx, ev); err != nil {
					return err
				}
				if err := store.Ledger.Insert(ctx, &entity.PointTransaction{
					UserID: userID, Currency: entity.CurrencyXP, Amount: -s.cfg.InactivityPenaltyXP,
					Reason: penalty.ReasonInactivity, DomainEventID: &ev.ID,
				}); err != nil {
					return err
				}
				penaltyStats.PenaltyXP += -s.cfg.InactivityPenaltyXP
				penaltyStats.XPEarned += -s.cfg.InactivityPenaltyXP
			}
		}
		if penaltyStats.PenaltyXP != 0 {
			return store.Stats.UpsertDailyStats(ctx, penaltyStats)
		}
		return nil
	})
}

func (s *Service) SettleDueDays(ctx context.Context) (int, error) {
	store := repository.NewStore(s.pool)
	users, err := store.User.ListIDs(ctx)
	if err != nil {
		return 0, err
	}
	total := 0
	for _, u := range users {
		n, err := s.settleDueDaysForUser(ctx, u)
		total += n
		if err != nil {
			return total, err
		}
	}
	return total, nil
}

func (s *Service) settleDueDaysForUser(ctx context.Context, userID string) (int, error) {
	store := repository.NewStore(s.pool)
	last, err := store.Stats.LastSettledDay(ctx, userID)
	if err != nil {
		return 0, err
	}
	yesterday := s.today().AddDate(0, 0, -1)
	start := yesterday
	if last != nil {
		start = s.dayOf(*last).AddDate(0, 0, 1)
		if start.After(yesterday) {
			return 0, nil
		}
	}
	count := 0
	for d := start; !d.After(yesterday); d = d.AddDate(0, 0, 1) {
		if err := s.SettleDay(ctx, userID, d); err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}

func (s *Service) GoalProgress(ctx context.Context, userID string, goalID string) (*GoalProgress, error) {
	store := repository.NewStore(s.pool)
	goal, err := store.Goal.GetByID(ctx, goalID)
	if err != nil {
		return nil, err
	}
	if goal.UserID != userID {
		return nil, ErrWrongOwner
	}
	earned, err := store.Ledger.SumGPPForGoal(ctx, userID, goalID)
	if err != nil {
		return nil, err
	}
	return &GoalProgress{Goal: *goal, EarnedGPP: earned, Percent: progress.GoalPercent(earned, goal.TotalGPP)}, nil
}

type GoalDetail struct {
	Goal       entity.Goal
	Milestones []entity.Milestone
	EarnedGPP  int
}

func (s *Service) GoalDetail(ctx context.Context, userID string, goalID string) (*GoalDetail, error) {
	store := repository.NewStore(s.pool)
	goal, err := store.Goal.GetByID(ctx, goalID)
	if err != nil {
		return nil, err
	}
	if goal.UserID != userID {
		return nil, ErrWrongOwner
	}
	milestones, err := store.Goal.Milestones(ctx, goalID)
	if err != nil {
		return nil, err
	}
	earned, err := store.Ledger.SumGPPForGoal(ctx, userID, goalID)
	if err != nil {
		return nil, err
	}
	return &GoalDetail{Goal: *goal, Milestones: milestones, EarnedGPP: earned}, nil
}

func (s *Service) ListTasks(ctx context.Context, userID string, status string, limit, offset int) ([]entity.Task, int, error) {
	store := repository.NewStore(s.pool)
	tasks, err := store.Task.ListByUser(ctx, userID, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := store.Task.Count(ctx, userID, status)
	if err != nil {
		return nil, 0, err
	}
	return tasks, total, nil
}

func (s *Service) RecentActivity(ctx context.Context, userID string, limit, offset int) ([]entity.DomainEvent, int, error) {
	store := repository.NewStore(s.pool)
	events, err := store.Event.ListRecent(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := store.Event.Count(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	return events, total, nil
}

func (s *Service) ListTransactions(ctx context.Context, userID string, limit, offset int) ([]Transaction, int, error) {
	store := repository.NewStore(s.pool)
	rows, err := store.Ledger.ListRecent(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	out := make([]Transaction, 0, len(rows))
	for _, r := range rows {
		out = append(out, Transaction{
			ID: r.ID, Currency: r.Currency, Amount: r.Amount, Reason: r.Reason,
			GoalID: r.GoalID, GoalTitle: r.GoalTitle, SourceTitle: r.SourceTitle, DomainEventID: r.DomainEventID, CreatedAt: r.CreatedAt,
		})
	}
	total, err := store.Ledger.Count(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (s *Service) AddPenalty(ctx context.Context, userID string, amount int, reason string, currency entity.Currency, goalID string) error {
	if amount < 1 || amount > 10000 || strings.TrimSpace(reason) == "" {
		return ErrValidation
	}
	if currency != entity.CurrencyXP && currency != entity.CurrencyGPP {
		return ErrValidation
	}
	if currency == entity.CurrencyGPP && goalID == "" {
		return ErrValidation
	}
	return s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		if currency == entity.CurrencyGPP {
			goal, err := store.Goal.GetByID(ctx, goalID)
			if err != nil {
				return err
			}
			if goal.UserID != userID {
				return ErrWrongOwner
			}
		}
		ev := &entity.DomainEvent{
			UserID: userID, EventType: entity.EventManualPenalty,
			AggregateType: "user",
			Payload: map[string]any{
				"amount": amount, "reason": reason, "currency": string(currency),
			},
		}
		if goalID != "" {
			ev.AggregateType = "goal"
			ev.AggregateID = &goalID
			ev.Payload["goal_id"] = goalID
		}
		if err := store.Event.Insert(ctx, ev); err != nil {
			return err
		}
		var goalIDPtr *string
		if goalID != "" {
			goalIDPtr = &goalID
		}
		if err := store.Ledger.Insert(ctx, &entity.PointTransaction{
			UserID: userID, Currency: currency, Amount: -amount,
			Reason: penalty.ReasonManual, GoalID: goalIDPtr, DomainEventID: &ev.ID,
		}); err != nil {
			return err
		}
		stats := &entity.DailyStats{UserID: userID, Day: s.today()}
		if currency == entity.CurrencyXP {
			stats.PenaltyXP = -amount
			stats.XPEarned = -amount
		} else {
			stats.GPPEarned = -amount
		}
		return store.Stats.UpsertDailyStats(ctx, stats)
	})
}

func (s *Service) DeleteTask(ctx context.Context, userID string, taskID string) error {
	return s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		task, err := store.Task.GetByID(ctx, taskID)
		if err != nil {
			return err
		}
		if task.UserID != userID {
			return ErrWrongOwner
		}
		if task.Status == entity.TaskStatusCompleted {
			events, err := store.Event.ListByAggregate(ctx, userID, "task", taskID)
			if err != nil {
				return err
			}
			for _, ev := range events {
				if ev.EventType != entity.EventTaskCompleted {
					continue
				}
				txs, err := store.Ledger.ByEvent(ctx, ev.ID)
				if err != nil {
					return err
				}
				if len(txs) == 0 {
					continue
				}
				reversal := &entity.DomainEvent{
					UserID: userID, EventType: entity.EventTaskDeleted,
					AggregateType: "task", AggregateID: &taskID,
					Payload: map[string]any{"goal_id": task.GoalID, "reason": "task_deleted"},
				}
				if err := store.Event.Insert(ctx, reversal); err != nil {
					return err
				}
				stats := &entity.DailyStats{UserID: userID, Day: s.dayOf(ev.OccurredAt), TasksCompleted: -1}
				for _, t := range txs {
					if err := store.Ledger.Insert(ctx, &entity.PointTransaction{
						UserID: userID, Currency: t.Currency, Amount: -t.Amount,
						Reason: "task_deleted", GoalID: t.GoalID, DomainEventID: &reversal.ID,
					}); err != nil {
						return err
					}
					switch t.Currency {
					case entity.CurrencyXP:
						stats.XPEarned -= t.Amount
						stats.TaskXP -= t.Amount
					case entity.CurrencyGPP:
						stats.GPPEarned -= t.Amount
					}
				}
				if err := store.Stats.UpsertDailyStats(ctx, stats); err != nil {
					return err
				}
			}
		}
		return store.Task.Delete(ctx, taskID)
	})
}

func (s *Service) DeleteGoal(ctx context.Context, userID string, goalID string) error {
	return s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		goal, err := store.Goal.GetByID(ctx, goalID)
		if err != nil {
			return err
		}
		if goal.UserID != userID {
			return ErrWrongOwner
		}
		if err := store.Task.DeleteByGoal(ctx, goalID); err != nil {
			return err
		}
		if err := store.Ledger.DeleteGPPByGoal(ctx, userID, goalID); err != nil {
			return err
		}
		ev := &entity.DomainEvent{
			UserID: userID, EventType: entity.EventGoalDeleted,
			AggregateType: "goal", AggregateID: &goalID,
			Payload: map[string]any{"title": goal.Title},
		}
		if err := store.Event.Insert(ctx, ev); err != nil {
			return err
		}
		return store.Goal.Delete(ctx, goalID)
	})
}

func (s *Service) DeleteHabit(ctx context.Context, userID string, habitID string) error {
	return s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		habit, err := store.Habit.GetByID(ctx, habitID)
		if err != nil {
			return err
		}
		if habit.UserID != userID {
			return ErrWrongOwner
		}
		ev := &entity.DomainEvent{
			UserID: userID, EventType: entity.EventHabitDeleted,
			AggregateType: "habit", AggregateID: &habitID,
			Payload: map[string]any{"title": habit.Title},
		}
		if err := store.Event.Insert(ctx, ev); err != nil {
			return err
		}
		return store.Habit.Delete(ctx, habitID)
	})
}

func (s *Service) ListGoals(ctx context.Context, userID string) ([]entity.Goal, error) {
	store := repository.NewStore(s.pool)
	return store.Goal.ListByUser(ctx, userID)
}

func (s *Service) GoalMilestonesByIDs(ctx context.Context, goalIDs []string) ([]entity.Milestone, error) {
	store := repository.NewStore(s.pool)
	return store.Goal.MilestonesByGoalIDs(ctx, goalIDs)
}

func (s *Service) ListHabits(ctx context.Context, userID string) ([]entity.Habit, error) {
	store := repository.NewStore(s.pool)
	return store.Habit.ListByUser(ctx, userID)
}

func (s *Service) ListStreaks(ctx context.Context, userID string) ([]entity.Streak, error) {
	store := repository.NewStore(s.pool)
	return store.Streak.ListByUser(ctx, userID)
}

func (s *Service) ListAchievements(ctx context.Context, userID string) ([]entity.Achievement, error) {
	store := repository.NewStore(s.pool)
	return store.Stats.ListAchievements(ctx, userID)
}

func (s *Service) LevelCurrent(ctx context.Context, userID string) (*LevelInfo, error) {
	store := repository.NewStore(s.pool)
	xp, err := store.Ledger.SumXP(ctx, userID)
	if err != nil {
		return nil, err
	}
	lv := level.ForXP(xp)
	info := &LevelInfo{XP: xp, LevelName: lv.Name, LevelIdx: lv.Index}
	if next, ok := level.NextThreshold(xp); ok {
		info.NextXP = &next
	}
	return info, nil
}

func (s *Service) TodayStats(ctx context.Context, userID string) (*DailySummary, error) {
	store := repository.NewStore(s.pool)
	stats, err := store.Stats.GetDailyStats(ctx, userID, dayKey(s.today()))
	if err != nil {
		return nil, err
	}
	return toSummary(stats), nil
}

func (s *Service) WeekStats(ctx context.Context, userID string, weeksBack int) (*WeekSummary, error) {
	store := repository.NewStore(s.pool)
	to := s.today().AddDate(0, 0, -7*weeksBack)
	from := to.AddDate(0, 0, -6)
	rows, err := store.Stats.StatsRange(ctx, userID, dayKey(from), dayKey(to))
	if err != nil {
		return nil, err
	}
	sum := &WeekSummary{}
	for _, r := range rows {
		sum.Days = append(sum.Days, *toSummary(&r))
		sum.TotalXP += r.XPEarned
	}
	sum.AvgDailyXP = sum.TotalXP / 7
	sum.SuggestedWeeklyGoal = economy.WeeklySuggestion(sum.AvgDailyXP)
	return sum, nil
}

func toSummary(s *entity.DailyStats) *DailySummary {
	if s == nil {
		return &DailySummary{}
	}
	return &DailySummary{
		Day: dayKey(s.Day), XPEarned: s.XPEarned, HabitXP: s.HabitXP, TaskXP: s.TaskXP,
		PenaltyXP: s.PenaltyXP, GPPEarned: s.GPPEarned,
		TasksCompleted: s.TasksCompleted, HabitsCompleted: s.HabitsCompleted,
	}
}

func (s *Service) Analytics(ctx context.Context, userID string, weeksBack int) (*Analytics, error) {
	store := repository.NewStore(s.pool)
	week, err := s.WeekStats(ctx, userID, weeksBack)
	if err != nil {
		return nil, err
	}
	to := s.today().AddDate(0, 0, -7*weeksBack)
	from := to.AddDate(0, 0, -6)
	categories, err := store.Stats.HabitXPByCategory(ctx, userID, dayKey(from), dayKey(to))
	if err != nil {
		return nil, err
	}
	taskXP, err := store.Stats.TaskXPInRange(ctx, userID, dayKey(from), dayKey(to))
	if err != nil {
		return nil, err
	}
	ratio := 0.0
	habitTotal := 0
	taskTotal := 0
	for _, d := range week.Days {
		habitTotal += d.HabitXP
		taskTotal += d.TaskXP
	}
	if taskTotal > 0 {
		ratio = float64(habitTotal) / float64(taskTotal)
	}
	out := make([]CategoryStat, 0, len(categories))
	for _, c := range categories {
		out = append(out, CategoryStat{Category: c.Category, XP: c.XP})
	}
	return &Analytics{
		Week: *week, HabitByCategory: out, TaskXPLastWeek: taskXP,
		RoutineStrategicRatio: ratio,
	}, nil
}

func (s *Service) Authenticate(ctx context.Context, name string) (*entity.User, error) {
	store := repository.NewStore(s.pool)
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, ErrValidation
	}
	u, err := store.User.GetByName(ctx, name)
	if err == nil {
		return u, nil
	}
	if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	count, err := store.User.Count(ctx)
	if err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, ErrAccountNotFound
	}
	return store.User.Create(ctx, name)
}

func (s *Service) Me(ctx context.Context, userID string) (*entity.User, error) {
	store := repository.NewStore(s.pool)
	return store.User.GetByID(ctx, userID)
}

func (s *Service) Location() *time.Location {
	return s.loc
}
