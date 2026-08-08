package service

import (
	"context"
	"errors"
	"orbit/internal/auth"
	"orbit/internal/engine/economy"
	"orbit/internal/engine/level"
	"orbit/internal/engine/penalty"
	"orbit/internal/engine/progress"
	"orbit/internal/engine/scoring"
	"orbit/internal/engine/streak"
	"orbit/internal/entity"
	"orbit/internal/repository"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrValidation         = errors.New("validation failed")
	ErrTaskCompleted      = errors.New("task already completed")
	ErrMilestoneOrder     = errors.New("milestone_from must be below milestone_to")
	ErrWrongOwner         = errors.New("resource belongs to another user")
	ErrInactiveGoal       = errors.New("goal is not active")
	ErrMissingMilestone   = errors.New("goal requires 0% and 100% milestones")
	ErrUserExists         = errors.New("user already exists")
	ErrInvalidCredentials = errors.New("invalid credentials")
)

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

type MilestoneInput struct {
	Percent      int
	RewardPoints int
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

func (s *Service) CreateGoal(ctx context.Context, userID string, title string, totalGPP int, milestones []MilestoneInput) (*entity.Goal, error) {
	if totalGPP <= 0 || len(milestones) < 2 {
		return nil, ErrValidation
	}
	if err := validateMilestones(milestones, totalGPP); err != nil {
		return nil, err
	}
	var goal *entity.Goal
	err := s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		g := &entity.Goal{UserID: userID, Title: title, TotalGPP: totalGPP, Status: entity.GoalStatusActive}
		if err := store.Goal.Create(ctx, g); err != nil {
			return err
		}
		for _, m := range milestones {
			ms := &entity.Milestone{GoalID: g.ID, Percent: m.Percent, RewardPoints: m.RewardPoints}
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

func validateMilestones(milestones []MilestoneInput, totalGPP int) error {
	hasZero := false
	hasHundred := false
	for i, m := range milestones {
		if m.Percent < 0 || m.Percent > 100 || m.RewardPoints < 0 {
			return ErrValidation
		}
		if i > 0 && m.Percent <= milestones[i-1].Percent {
			return ErrValidation
		}
		if m.Percent == 0 {
			hasZero = true
		}
		if m.Percent == 100 {
			hasHundred = true
			if m.RewardPoints != totalGPP {
				return ErrValidation
			}
		}
	}
	if !hasZero || !hasHundred {
		return ErrMissingMilestone
	}
	return nil
}

func (s *Service) CreateTask(ctx context.Context, userID string, goalID string, title string, milestoneFromID string, milestoneToID string, coef int, difficulty string) (*entity.Task, error) {
	if coef < scoring.CoefMin || coef > scoring.CoefMax {
		return nil, ErrValidation
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
		from, err := store.Goal.MilestoneByID(ctx, milestoneFromID)
		if err != nil {
			return err
		}
		to, err := store.Goal.MilestoneByID(ctx, milestoneToID)
		if err != nil {
			return err
		}
		if from.GoalID != goalID || to.GoalID != goalID {
			return ErrWrongOwner
		}
		if from.Percent >= to.Percent {
			return ErrMilestoneOrder
		}
		t := &entity.Task{
			UserID: userID, GoalID: goalID, MilestoneFromID: milestoneFromID, MilestoneToID: milestoneToID,
			Title: title, ContributionCoef: coef, Difficulty: difficulty, Status: entity.TaskStatusOpen,
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
		from, err := store.Goal.MilestoneByID(ctx, task.MilestoneFromID)
		if err != nil {
			return err
		}
		to, err := store.Goal.MilestoneByID(ctx, task.MilestoneToID)
		if err != nil {
			return err
		}
		gpp := scoring.GPP(to.RewardPoints, from.RewardPoints, task.ContributionCoef)
		xp := scoring.TaskXP(gpp, task.Difficulty)
		ev := &entity.DomainEvent{
			UserID: userID, EventType: entity.EventTaskCompleted,
			AggregateType: "task", AggregateID: &task.ID,
			Payload: map[string]any{"goal_id": task.GoalID, "gpp": gpp, "xp": xp},
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

func (s *Service) RegressTask(ctx context.Context, userID string, taskID string, amount int) error {
	if amount <= 0 {
		return ErrValidation
	}
	return s.withTx(ctx, func(tx pgx.Tx) error {
		store := repository.NewStore(tx)
		task, err := store.Task.GetByID(ctx, taskID)
		if err != nil {
			return err
		}
		if task.UserID != userID {
			return ErrWrongOwner
		}
		ev := &entity.DomainEvent{
			UserID: userID, EventType: entity.EventTaskRegressed,
			AggregateType: "task", AggregateID: &task.ID,
			Payload: map[string]any{"goal_id": task.GoalID, "amount": amount},
		}
		if err := store.Event.Insert(ctx, ev); err != nil {
			return err
		}
		if err := store.Ledger.Insert(ctx, &entity.PointTransaction{
			UserID: userID, Currency: entity.CurrencyGPP, Amount: -amount,
			Reason: penalty.ReasonRegression, GoalID: &task.GoalID, DomainEventID: &ev.ID,
		}); err != nil {
			return err
		}
		stats := &entity.DailyStats{UserID: userID, Day: s.today(), GPPEarned: -amount}
		return store.Stats.UpsertDailyStats(ctx, stats)
	})
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
			ms := make([]streak.Milestone, 0, len(habit.StreakMilestones))
			for _, m := range habit.StreakMilestones {
				ms = append(ms, streak.Milestone{Days: m.Days, BonusXP: m.BonusXP})
			}
			if b, ok := streak.MilestoneBonus(ms, state.CurrentDays); ok {
				bonus = b
			}
			for _, m := range habit.StreakMilestones {
				if m.Days == state.CurrentDays {
					achievementCode = m.AchievementCode
					break
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
				"base_xp": habit.BaseXP, "bonus_xp": bonus, "awarded": baseAwarded + bonusAwarded,
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
					AggregateType: "achievement", AggregateID: &achievementCode,
					Payload: map[string]any{"habit_id": habitID},
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
		return nil
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

func (s *Service) ListGoals(ctx context.Context, userID string) ([]entity.Goal, error) {
	store := repository.NewStore(s.pool)
	return store.Goal.ListByUser(ctx, userID)
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

func (s *Service) WeekStats(ctx context.Context, userID string) (*WeekSummary, error) {
	store := repository.NewStore(s.pool)
	from := s.today().AddDate(0, 0, -6)
	rows, err := store.Stats.StatsRange(ctx, userID, dayKey(from), dayKey(s.today()))
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

func (s *Service) Analytics(ctx context.Context, userID string) (*Analytics, error) {
	store := repository.NewStore(s.pool)
	week, err := s.WeekStats(ctx, userID)
	if err != nil {
		return nil, err
	}
	from := s.today().AddDate(0, 0, -6)
	categories, err := store.Stats.HabitXPByCategory(ctx, userID, dayKey(from))
	if err != nil {
		return nil, err
	}
	taskXP, err := store.Stats.TaskXPInRange(ctx, userID, dayKey(from))
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

func (s *Service) Register(ctx context.Context, email string, password string) (*entity.User, error) {
	store := repository.NewStore(s.pool)
	count, err := store.User.Count(ctx)
	if err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, ErrUserExists
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return nil, err
	}
	return store.User.Create(ctx, email, hash)
}

func (s *Service) Login(ctx context.Context, email string, password string) (*entity.User, error) {
	store := repository.NewStore(s.pool)
	u, err := store.User.GetByEmail(ctx, email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if !auth.CheckPasswordHash(password, u.PasswordHash) {
		return nil, ErrInvalidCredentials
	}
	return u, nil
}

func (s *Service) Location() *time.Location {
	return s.loc
}
