package dto

type LoginRequest struct {
	Name string `json:"name"`
}

type MeResponse struct {
	Name string `json:"name"`
}

type AuthResponse struct {
	AccessToken string `json:"access_token"`
}

type MilestoneRequest struct {
	Percent      int `json:"percent"`
	RewardPoints int `json:"reward_points"`
}

type CreateGoalRequest struct {
	Title      string             `json:"title"`
	TotalGPP   int                `json:"total_gpp"`
	Milestones []MilestoneRequest `json:"milestones"`
}

type CreateTaskRequest struct {
	GoalID     string `json:"goal_id"`
	Title      string `json:"title"`
	GPPReward  int    `json:"gpp_reward"`
	Difficulty string `json:"difficulty"`
}

type StreakMilestoneRequest struct {
	Days            int    `json:"days"`
	BonusXP         int    `json:"bonus_xp"`
	AchievementCode string `json:"achievement_code"`
}

type CreateHabitRequest struct {
	Title          string                   `json:"title"`
	BaseXP         int                      `json:"base_xp"`
	StreakTracking bool                     `json:"streak_tracking"`
	Category       string                   `json:"category"`
	Milestones     []StreakMilestoneRequest `json:"milestones"`
}

type CheckInRequest struct {
	Mood string `json:"mood"`
}

type AddPenaltyRequest struct {
	Amount   int    `json:"amount"`
	Reason   string `json:"reason"`
	Currency string `json:"currency"`
	GoalID   string `json:"goal_id,omitempty"`
}

type MilestoneResponse struct {
	ID           string `json:"id"`
	Percent      int    `json:"percent"`
	RewardPoints int    `json:"reward_points"`
}

type GoalResponse struct {
	ID         string              `json:"id"`
	Title      string              `json:"title"`
	TotalGPP   int                 `json:"total_gpp"`
	Status     string              `json:"status"`
	CreatedAt  string              `json:"created_at"`
	Milestones []MilestoneResponse `json:"milestones"`
}

type GoalProgressResponse struct {
	GoalID    string `json:"goal_id"`
	Title     string `json:"title"`
	TotalGPP  int    `json:"total_gpp"`
	EarnedGPP int    `json:"earned_gpp"`
	Percent   int    `json:"percent"`
}

type TaskResponse struct {
	ID         string `json:"id"`
	GoalID     string `json:"goal_id"`
	Title      string `json:"title"`
	GPPReward  int    `json:"gpp_reward"`
	Difficulty string `json:"difficulty"`
	Status     string `json:"status"`
}

type HabitResponse struct {
	ID              string                    `json:"id"`
	Title           string                    `json:"title"`
	BaseXP          int                       `json:"base_xp"`
	StreakTracking  bool                      `json:"streak_tracking"`
	Category        string                    `json:"category"`
	LastCompletedAt *string                   `json:"last_completed_at,omitempty"`
	Milestones      []StreakMilestoneResponse `json:"milestones"`
}

type StreakMilestoneResponse struct {
	Days            int    `json:"days"`
	BonusXP         int    `json:"bonus_xp"`
	AchievementCode string `json:"achievement_code"`
}

type CompletionResponse struct {
	GPP             int    `json:"gpp"`
	XP              int    `json:"xp"`
	BonusXP         int    `json:"bonus_xp,omitempty"`
	StreakDays      int    `json:"streak_days,omitempty"`
	AchievementCode string `json:"achievement_code,omitempty"`
}

type StreakResponse struct {
	HabitID     string `json:"habit_id"`
	CurrentDays int    `json:"current_days"`
	LongestDays int    `json:"longest_days"`
	MissesInRow int    `json:"misses_in_row"`
	LastSuccess string `json:"last_success,omitempty"`
}

type AchievementResponse struct {
	Code       string `json:"code"`
	UnlockedAt string `json:"unlocked_at"`
}

type LevelResponse struct {
	XP        int    `json:"xp"`
	LevelName string `json:"level_name"`
	LevelIdx  int    `json:"level_idx"`
	NextXP    *int   `json:"next_xp,omitempty"`
}

type DailyStatsResponse struct {
	Day             string `json:"day"`
	XPEarned        int    `json:"xp_earned"`
	HabitXP         int    `json:"habit_xp"`
	TaskXP          int    `json:"task_xp"`
	PenaltyXP       int    `json:"penalty_xp"`
	GPPEarned       int    `json:"gpp_earned"`
	TasksCompleted  int    `json:"tasks_completed"`
	HabitsCompleted int    `json:"habits_completed"`
}

type WeekStatsResponse struct {
	Days                []DailyStatsResponse `json:"days"`
	TotalXP             int                  `json:"total_xp"`
	AvgDailyXP          int                  `json:"avg_daily_xp"`
	SuggestedWeeklyGoal int                  `json:"suggested_weekly_goal"`
}

type CategoryStatResponse struct {
	Category string `json:"category"`
	XP       int    `json:"xp"`
}

type AnalyticsResponse struct {
	Week                  WeekStatsResponse      `json:"week"`
	HabitByCategory       []CategoryStatResponse `json:"habit_by_category"`
	TaskXPLastWeek        int                    `json:"task_xp_last_week"`
	RoutineStrategicRatio float64                `json:"routine_strategic_ratio"`
}

type TransactionResponse struct {
	ID        string  `json:"id"`
	Currency  string  `json:"currency"`
	Amount    int     `json:"amount"`
	Reason    string  `json:"reason"`
	GoalID    *string `json:"goal_id,omitempty"`
	GoalTitle string  `json:"goal_title,omitempty"`
	CreatedAt string  `json:"created_at"`
}

type ActivityResponse struct {
	ID            string         `json:"id"`
	EventType     string         `json:"event_type"`
	AggregateType string         `json:"aggregate_type"`
	AggregateID   *string        `json:"aggregate_id,omitempty"`
	Payload       map[string]any `json:"payload"`
	OccurredAt    string         `json:"occurred_at"`
}

type ActivityPageResponse struct {
	Items []ActivityResponse `json:"items"`
	Total int                `json:"total"`
}

type TransactionPageResponse struct {
	Items []TransactionResponse `json:"items"`
	Total int                   `json:"total"`
}

type TaskPageResponse struct {
	Items []TaskResponse `json:"items"`
	Total int            `json:"total"`
}
