const API_BASE = "/api"
const TOKEN_KEY = "orbit_token"
const NAME_KEY = "orbit_name"

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function getStoredName(): string | null {
  return localStorage.getItem(NAME_KEY)
}

export function setStoredName(name: string) {
  localStorage.setItem(NAME_KEY, name)
}

async function fetchWithToken(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken()
  return fetch(API_BASE + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
}

async function refreshSession(name: string): Promise<boolean> {
  try {
    const res = await fetch(API_BASE + "/v1/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as AuthResponse
    setToken(data.access_token)
    window.dispatchEvent(new Event("orbit:authed"))
    return true
  } catch {
    return false
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await fetchWithToken(path, init)
  if (res.status === 401) {
    const name = getStoredName()
    if (name && (await refreshSession(name))) {
      res = await fetchWithToken(path, init)
    }
  }
  if (res.status === 401) {
    setToken(null)
    window.dispatchEvent(new Event("orbit:unauthorized"))
  }
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* keep status text */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) })
const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) })
const del = <T>(path: string) => request<T>(path, { method: "DELETE" })

export interface Milestone {
  id: string
  percent: number
  reward_points: number
}

export interface Goal {
  id: string
  title: string
  total_gpp: number
  status: string
  parent_goal_id?: string
  created_at: string
  milestones: Milestone[]
}

export interface GoalProgress {
  goal_id: string
  title: string
  total_gpp: number
  earned_gpp: number
  percent: number
}

export interface Task {
  id: string
  goal_id: string
  title: string
  gpp_reward: number
  difficulty: string
  status: string
}

export interface StreakMilestone {
  days: number
  bonus_xp: number
  achievement_code?: string
}

export interface Habit {
  id: string
  title: string
  base_xp: number
  streak_tracking: boolean
  category: string
  last_completed_at?: string
  milestones: StreakMilestone[]
}

export interface Streak {
  habit_id: string
  current_days: number
  longest_days: number
  misses_in_row: number
  last_success?: string
}

export interface Achievement {
  code: string
  unlocked_at: string
}

export interface LevelInfo {
  xp: number
  level_name: string
  level_idx: number
  next_xp?: number
}

export interface DailyStats {
  day: string
  xp_earned: number
  habit_xp: number
  task_xp: number
  penalty_xp: number
  gpp_earned: number
  tasks_completed: number
  habits_completed: number
}

export interface WeekStats {
  days: DailyStats[]
  total_xp: number
  avg_daily_xp: number
  suggested_weekly_goal: number
}

export interface CategoryStat {
  category: string
  xp: number
}

export interface Analytics {
  week: WeekStats
  habit_by_category: CategoryStat[]
  task_xp_last_week: number
  routine_strategic_ratio: number
}

export interface Transaction {
  id: string
  currency: "gpp" | "xp"
  amount: number
  reason: string
  goal_id?: string
  goal_title?: string
  source_title?: string
  domain_event_id?: string
  created_at: string
}

export interface ActivityEvent {
  id: string
  event_type: string
  aggregate_type: string
  aggregate_id?: string
  payload: Record<string, unknown>
  occurred_at: string
}

export interface Page<T> {
  items: T[]
  total: number
}

export type MetricType = "count" | "duration" | "rate" | "score" | "binary" | "note"

export interface MetricInput {
  name: string
  type: MetricType
  unit?: string
  direction?: string
  is_primary: boolean
  baseline_source?: string
  baseline_value?: number
  baseline_denom?: number
}

export interface MetricStats {
  average?: number
  min?: number
  max?: number
  change_pct?: number
  trend_better?: boolean
  consistency: number
  value_count: number
}

export interface Metric {
  id: string
  name: string
  type: MetricType
  unit?: string
  direction?: string
  is_primary: boolean
  baseline_source: string
  baseline_value?: number
  baseline_denom?: number
  suggested_baseline?: number
  stats?: MetricStats
}

export interface CheckinValue {
  metric_id: string
  num_value?: number
  denom_value?: number
  text_value?: string
}

export interface Checkin {
  id: string
  day: string
  note: string
  values: CheckinValue[]
}

export interface Verdict {
  primary_metric_id: string
  metric_name: string
  change_pct?: number
  outcome: "improved" | "worsened" | "neutral" | "no_baseline" | "no_data"
}

export interface PrimarySummary {
  metric_name: string
  average?: number
  change_pct?: number
  consistency: number
}

export type VersionStatus = "draft" | "running" | "ended" | "completed" | "aborted"

export interface ExperimentVersion {
  id: string
  experiment_id: string
  version_number: number
  change: string
  success_criteria: string
  duration_days: number
  status: VersionStatus
  started_at?: string
  completed_at?: string
  reflection: string
  day_index: number
  days_left: number
  metrics: Metric[]
  checkins: Checkin[]
  verdict?: Verdict
  is_best: boolean
  primary_summary?: PrimarySummary
}

export interface VersionSummary {
  id: string
  version_number: number
  change: string
  status: VersionStatus
  duration_days: number
  day_index: number
  days_left: number
  primary_summary?: PrimarySummary
  is_best: boolean
  is_current: boolean
}

export interface Best {
  version_id: string
  change_pct?: number
}

export interface Experiment {
  id: string
  title: string
  created_at: string
  active_count: number
  completed_count: number
  aborted_count: number
  total_versions: number
  current?: VersionSummary
  best?: Best
  versions: VersionSummary[]
}

export interface Completion {
  gpp: number
  xp: number
  bonus_xp?: number
  streak_days?: number
  achievement_code?: string
}

interface AuthResponse {
  access_token: string
}

export const api = {
  session: (name: string) => post<AuthResponse>("/v1/auth/session", { name }),
  me: () => get<{ name: string }>("/v1/me"),

  goals: {
    list: () => get<Goal[]>("/v1/goals"),
    create: (body: { title: string; total_gpp: number; parent_goal_id?: string }) =>
      post<Goal>("/v1/goals", body),
    detail: (id: string) => get<Goal>(`/v1/goals/${id}`),
    progress: (id: string) => get<GoalProgress>(`/v1/goals/${id}/progress`),
    setParent: (id: string, parent_goal_id: string) =>
      request<Goal>(`/v1/goals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ parent_goal_id }),
      }),
    review: (id: string) => post<void>(`/v1/goals/${id}/review`),
    remove: (id: string) => del<void>(`/v1/goals/${id}`),
  },

  tasks: {
    list: (status?: string, limit?: number, offset?: number) =>
      get<Page<Task>>(
        `/v1/tasks?status=${status ?? ""}&limit=${limit ?? 0}&offset=${offset ?? 0}`,
      ),
    create: (body: {
      goal_id: string
      title: string
      gpp_reward: number
      difficulty: string
    }) => post<Task>("/v1/tasks", body),
    complete: (id: string) => post<Completion>(`/v1/tasks/${id}/complete`),
    remove: (id: string) => del<void>(`/v1/tasks/${id}`),
  },

  habits: {
    list: () => get<Habit[]>("/v1/habits"),
    create: (body: {
      title: string
      base_xp: number
      streak_tracking: boolean
      category: string
      milestones: { days: number; bonus_xp: number; achievement_code?: string }[]
    }) => post<Habit>("/v1/habits", body),
    complete: (id: string) => post<Completion>(`/v1/habits/${id}/complete`),
    remove: (id: string) => del<void>(`/v1/habits/${id}`),
  },

  stats: {
    today: () => get<DailyStats>("/v1/stats/today"),
    week: (weeksBack = 0) => get<WeekStats>(`/v1/stats/week?weeks=${weeksBack}`),
    level: () => get<LevelInfo>("/v1/levels/current"),
    streaks: () => get<Streak[]>("/v1/streaks"),
    achievements: () => get<Achievement[]>("/v1/achievements"),
    analytics: (weeksBack = 0) => get<Analytics>(`/v1/analytics/overview?weeks=${weeksBack}`),
    activity: (limit: number, offset: number) =>
      get<Page<ActivityEvent>>(`/v1/activity?limit=${limit}&offset=${offset}`),
    transactions: (limit: number, offset: number) =>
      get<Page<Transaction>>(`/v1/transactions?limit=${limit}&offset=${offset}`),
    checkin: (mood: string) => post<void>("/v1/checkin", { mood }),
  },

  penalties: {
    add: (body: { amount: number; reason: string; currency: string; goal_id?: string }) =>
      post<void>("/v1/penalties", body),
  },

  experiments: {
    list: () => get<Experiment[]>("/v1/experiments"),
    create: (body: { title: string }) => post<Experiment>("/v1/experiments", body),
    detail: (id: string) => get<Experiment>(`/v1/experiments/${id}`),
    update: (id: string, body: { title: string }) =>
      request<void>(`/v1/experiments/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => del<void>(`/v1/experiments/${id}`),
    fork: (id: string) => post<ExperimentVersion>(`/v1/experiments/${id}/versions`),
    version: (id: string, versionId: string) =>
      get<ExperimentVersion>(`/v1/experiments/${id}/versions/${versionId}`),
    updateVersion: (
      id: string,
      versionId: string,
      body: {
        change: string
        success_criteria: string
        duration_days: number
        metrics: MetricInput[]
      },
    ) =>
      request<void>(`/v1/experiments/${id}/versions/${versionId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    deleteVersion: (id: string, versionId: string) =>
      del<void>(`/v1/experiments/${id}/versions/${versionId}`),
    start: (id: string, versionId: string) =>
      post<ExperimentVersion>(`/v1/experiments/${id}/versions/${versionId}/start`),
    upsertCheckin: (
      id: string,
      versionId: string,
      day: string,
      body: { values: CheckinValue[]; note: string },
    ) =>
      put<ExperimentVersion>(`/v1/experiments/${id}/versions/${versionId}/checkins/${day}`, body),
    deleteCheckin: (id: string, versionId: string, day: string) =>
      del<void>(`/v1/experiments/${id}/versions/${versionId}/checkins/${day}`),
    reflection: (id: string, versionId: string, reflection: string) =>
      post<ExperimentVersion>(`/v1/experiments/${id}/versions/${versionId}/reflection`, {
        reflection,
      }),
  },
}
