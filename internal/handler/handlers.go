package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"orbit/internal/auth"
	"orbit/internal/dto"
	"orbit/internal/entity"
	"orbit/internal/middleware"
	"orbit/internal/service"
	"strconv"

	"github.com/go-chi/chi/v5"
)

type Handlers struct {
	Goals  *GoalHandler
	Tasks  *TaskHandler
	Habits *HabitHandler
	Stats  *StatsHandler
	Auth   *AuthHandler
}

func NewHandlers(svc *service.Service, jwtManager *auth.JWTManager) *Handlers {
	return &Handlers{
		Goals:  &GoalHandler{svc: svc},
		Tasks:  &TaskHandler{svc: svc},
		Habits: &HabitHandler{svc: svc},
		Stats:  &StatsHandler{svc: svc},
		Auth:   &AuthHandler{svc: svc, jwt: jwtManager},
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func pageParams(r *http.Request, defLimit, maxLimit int) (int, int) {
	limit := defLimit
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	if maxLimit > 0 && limit > maxLimit {
		limit = maxLimit
	}
	offset := 0
	if v := r.URL.Query().Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			offset = n
		}
	}
	return limit, offset
}

func weeksParam(r *http.Request) int {
	n := 0
	if v := r.URL.Query().Get("weeks"); v != "" {
		if k, err := strconv.Atoi(v); err == nil && k > 0 {
			n = k
		}
	}
	return n
}

func statusFor(err error) int {
	switch {
	case errors.Is(err, service.ErrValidation),
		errors.Is(err, service.ErrMilestoneOrder),
		errors.Is(err, service.ErrMissingMilestone),
		errors.Is(err, service.ErrInactiveGoal):
		return http.StatusBadRequest
	case errors.Is(err, service.ErrTaskCompleted),
		errors.Is(err, service.ErrHabitDoneToday):
		return http.StatusConflict
	case errors.Is(err, service.ErrWrongOwner):
		return http.StatusForbidden
	case errors.Is(err, service.ErrAccountNotFound):
		return http.StatusUnauthorized
	default:
		return http.StatusInternalServerError
	}
}

type AuthHandler struct {
	svc *service.Service
	jwt *auth.JWTManager
}

func (h *AuthHandler) Session(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	user, err := h.svc.Authenticate(r.Context(), req.Name)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	token, err := h.jwt.GenerateAccessToken(user.ID, "owner")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "token generation failed")
		return
	}
	writeJSON(w, http.StatusOK, dto.AuthResponse{AccessToken: token})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, err := h.svc.Me(r.Context(), middleware.GetUserID(r.Context()))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, dto.MeResponse{Name: user.Name})
}

type GoalHandler struct {
	svc *service.Service
}

func (h *GoalHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	milestones := make([]service.MilestoneInput, 0, len(req.Milestones))
	for _, m := range req.Milestones {
		milestones = append(milestones, service.MilestoneInput{Percent: m.Percent, RewardPoints: m.RewardPoints})
	}
	goal, err := h.svc.CreateGoal(r.Context(), middleware.GetUserID(r.Context()), req.Title, req.TotalGPP, milestones)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, goalToResponse(goal, nil))
}

func (h *GoalHandler) List(w http.ResponseWriter, r *http.Request) {
	goals, err := h.svc.ListGoals(r.Context(), middleware.GetUserID(r.Context()))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	out := make([]dto.GoalResponse, 0, len(goals))
	for i := range goals {
		out = append(out, goalToResponse(&goals[i], nil))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *GoalHandler) Detail(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	goalID := chi.URLParam(r, "goalID")
	detail, err := h.svc.GoalDetail(r.Context(), userID, goalID)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, goalToResponse(&detail.Goal, detail.Milestones))
}

func (h *GoalHandler) Progress(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	goalID := chi.URLParam(r, "goalID")
	prog, err := h.svc.GoalProgress(r.Context(), userID, goalID)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, dto.GoalProgressResponse{
		GoalID: prog.Goal.ID, Title: prog.Goal.Title, TotalGPP: prog.Goal.TotalGPP,
		EarnedGPP: prog.EarnedGPP, Percent: prog.Percent,
	})
}

func (h *GoalHandler) Review(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	goalID := chi.URLParam(r, "goalID")
	if err := h.svc.ReviewGoal(r.Context(), userID, goalID); err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *GoalHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	goalID := chi.URLParam(r, "goalID")
	if err := h.svc.DeleteGoal(r.Context(), userID, goalID); err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func goalToResponse(g *entity.Goal, milestones []entity.Milestone) dto.GoalResponse {
	out := dto.GoalResponse{
		ID: g.ID, Title: g.Title, TotalGPP: g.TotalGPP,
		Status: string(g.Status), CreatedAt: g.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	for _, m := range milestones {
		out.Milestones = append(out.Milestones, dto.MilestoneResponse{
			ID: m.ID, Percent: m.Percent, RewardPoints: m.RewardPoints,
		})
	}
	return out
}

type TaskHandler struct {
	svc *service.Service
}

func (h *TaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	task, err := h.svc.CreateTask(r.Context(), middleware.GetUserID(r.Context()),
		req.GoalID, req.Title, req.GPPReward, req.Difficulty)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, taskResponse(task))
}

func (h *TaskHandler) List(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	limit, offset := pageParams(r, 0, 100)
	tasks, total, err := h.svc.ListTasks(r.Context(), middleware.GetUserID(r.Context()), status, limit, offset)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	out := make([]dto.TaskResponse, 0, len(tasks))
	for i := range tasks {
		out = append(out, taskResponse(&tasks[i]))
	}
	writeJSON(w, http.StatusOK, dto.TaskPageResponse{Items: out, Total: total})
}

func (h *TaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID := chi.URLParam(r, "taskID")
	if err := h.svc.DeleteTask(r.Context(), userID, taskID); err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *TaskHandler) Complete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID := chi.URLParam(r, "taskID")
	res, err := h.svc.CompleteTask(r.Context(), userID, taskID)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, completionResponse(res))
}

func taskResponse(t *entity.Task) dto.TaskResponse {
	return dto.TaskResponse{
		ID: t.ID, GoalID: t.GoalID, Title: t.Title,
		GPPReward: t.GPPReward, Difficulty: t.Difficulty, Status: string(t.Status),
	}
}

func completionResponse(c *service.Completion) dto.CompletionResponse {
	return dto.CompletionResponse{
		GPP: c.GPP, XP: c.XP, BonusXP: c.BonusXP,
		StreakDays: c.StreakDays, AchievementCode: c.AchievementCode,
	}
}

type HabitHandler struct {
	svc *service.Service
}

func (h *HabitHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateHabitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	milestones := make([]service.StreakMilestoneInput, 0, len(req.Milestones))
	for _, m := range req.Milestones {
		milestones = append(milestones, service.StreakMilestoneInput{
			Days: m.Days, BonusXP: m.BonusXP, AchievementCode: m.AchievementCode,
		})
	}
	habit, err := h.svc.CreateHabit(r.Context(), middleware.GetUserID(r.Context()),
		req.Title, req.BaseXP, req.StreakTracking, req.Category, milestones)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, habitResponse(habit))
}

func (h *HabitHandler) Complete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	habitID := chi.URLParam(r, "habitID")
	res, err := h.svc.CompleteHabit(r.Context(), userID, habitID)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, completionResponse(res))
}

func (h *HabitHandler) List(w http.ResponseWriter, r *http.Request) {
	habits, err := h.svc.ListHabits(r.Context(), middleware.GetUserID(r.Context()))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	out := make([]dto.HabitResponse, 0, len(habits))
	for i := range habits {
		out = append(out, habitResponse(&habits[i]))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *HabitHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	habitID := chi.URLParam(r, "habitID")
	if err := h.svc.DeleteHabit(r.Context(), userID, habitID); err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func habitResponse(h *entity.Habit) dto.HabitResponse {
	out := dto.HabitResponse{
		ID: h.ID, Title: h.Title, BaseXP: h.BaseXP,
		StreakTracking: h.StreakTracking, Category: h.Category,
	}
	if h.LastCompletedAt != nil {
		t := h.LastCompletedAt.Format("2006-01-02T15:04:05Z07:00")
		out.LastCompletedAt = &t
	}
	for _, m := range h.StreakMilestones {
		out.Milestones = append(out.Milestones, dto.StreakMilestoneResponse{
			Days: m.Days, BonusXP: m.BonusXP, AchievementCode: m.AchievementCode,
		})
	}
	return out
}

type StatsHandler struct {
	svc *service.Service
}

func (h *StatsHandler) Today(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.TodayStats(r.Context(), middleware.GetUserID(r.Context()))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, summaryResponse(stats))
}

func (h *StatsHandler) Week(w http.ResponseWriter, r *http.Request) {
	week, err := h.svc.WeekStats(r.Context(), middleware.GetUserID(r.Context()), weeksParam(r))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, weekResponse(week))
}

func (h *StatsHandler) Level(w http.ResponseWriter, r *http.Request) {
	lv, err := h.svc.LevelCurrent(r.Context(), middleware.GetUserID(r.Context()))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, dto.LevelResponse{
		XP: lv.XP, LevelName: lv.LevelName, LevelIdx: lv.LevelIdx, NextXP: lv.NextXP,
	})
}

func (h *StatsHandler) Streaks(w http.ResponseWriter, r *http.Request) {
	streaks, err := h.svc.ListStreaks(r.Context(), middleware.GetUserID(r.Context()))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	out := make([]dto.StreakResponse, 0, len(streaks))
	for _, s := range streaks {
		res := dto.StreakResponse{
			HabitID: s.HabitID, CurrentDays: s.CurrentDays,
			LongestDays: s.LongestDays, MissesInRow: s.MissesInRow,
		}
		if s.LastSuccessDate != nil {
			res.LastSuccess = s.LastSuccessDate.Format("2006-01-02")
		}
		out = append(out, res)
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *StatsHandler) Achievements(w http.ResponseWriter, r *http.Request) {
	ach, err := h.svc.ListAchievements(r.Context(), middleware.GetUserID(r.Context()))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	out := make([]dto.AchievementResponse, 0, len(ach))
	for _, a := range ach {
		out = append(out, dto.AchievementResponse{Code: a.Code, UnlockedAt: a.UnlockedAt.Format("2006-01-02T15:04:05Z07:00")})
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *StatsHandler) Analytics(w http.ResponseWriter, r *http.Request) {
	a, err := h.svc.Analytics(r.Context(), middleware.GetUserID(r.Context()), weeksParam(r))
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, analyticsResponse(a))
}

func (h *StatsHandler) CheckIn(w http.ResponseWriter, r *http.Request) {
	var req dto.CheckInRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.CheckIn(r.Context(), middleware.GetUserID(r.Context()), req.Mood); err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *StatsHandler) Penalty(w http.ResponseWriter, r *http.Request) {
	var req dto.AddPenaltyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	err := h.svc.AddPenalty(r.Context(), middleware.GetUserID(r.Context()),
		req.Amount, req.Reason, entity.Currency(req.Currency), req.GoalID)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *StatsHandler) Activity(w http.ResponseWriter, r *http.Request) {
	limit, offset := pageParams(r, 20, 100)
	events, total, err := h.svc.RecentActivity(r.Context(), middleware.GetUserID(r.Context()), limit, offset)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	out := make([]dto.ActivityResponse, 0, len(events))
	for _, e := range events {
		out = append(out, dto.ActivityResponse{
			ID: e.ID, EventType: string(e.EventType), AggregateType: e.AggregateType,
			AggregateID: e.AggregateID, Payload: e.Payload,
			OccurredAt: e.OccurredAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	writeJSON(w, http.StatusOK, dto.ActivityPageResponse{Items: out, Total: total})
}

func (h *StatsHandler) Transactions(w http.ResponseWriter, r *http.Request) {
	limit, offset := pageParams(r, 20, 100)
	txs, total, err := h.svc.ListTransactions(r.Context(), middleware.GetUserID(r.Context()), limit, offset)
	if err != nil {
		writeError(w, statusFor(err), err.Error())
		return
	}
	out := make([]dto.TransactionResponse, 0, len(txs))
	for _, t := range txs {
		res := dto.TransactionResponse{
			ID: t.ID, Currency: string(t.Currency), Amount: t.Amount, Reason: t.Reason,
			GoalID: t.GoalID, GoalTitle: t.GoalTitle,
			CreatedAt: t.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		out = append(out, res)
	}
	writeJSON(w, http.StatusOK, dto.TransactionPageResponse{Items: out, Total: total})
}

func summaryResponse(s *service.DailySummary) dto.DailyStatsResponse {
	return dto.DailyStatsResponse{
		Day: s.Day, XPEarned: s.XPEarned, HabitXP: s.HabitXP, TaskXP: s.TaskXP,
		PenaltyXP: s.PenaltyXP, GPPEarned: s.GPPEarned,
		TasksCompleted: s.TasksCompleted, HabitsCompleted: s.HabitsCompleted,
	}
}

func weekResponse(w *service.WeekSummary) dto.WeekStatsResponse {
	out := dto.WeekStatsResponse{
		Days:    make([]dto.DailyStatsResponse, 0, len(w.Days)),
		TotalXP: w.TotalXP, AvgDailyXP: w.AvgDailyXP, SuggestedWeeklyGoal: w.SuggestedWeeklyGoal,
	}
	for _, d := range w.Days {
		out.Days = append(out.Days, summaryResponse(&d))
	}
	return out
}

func analyticsResponse(a *service.Analytics) dto.AnalyticsResponse {
	out := dto.AnalyticsResponse{
		Week: weekResponse(&a.Week), TaskXPLastWeek: a.TaskXPLastWeek,
		RoutineStrategicRatio: a.RoutineStrategicRatio,
		HabitByCategory:       make([]dto.CategoryStatResponse, 0, len(a.HabitByCategory)),
	}
	for _, c := range a.HabitByCategory {
		out.HabitByCategory = append(out.HabitByCategory, dto.CategoryStatResponse{Category: c.Category, XP: c.XP})
	}
	return out
}
