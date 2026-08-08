const API_BASE = "/api"
const TOKEN_KEY = "orbit_token"

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(API_BASE + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
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
    create: (body: { title: string; total_gpp: number; milestones: { percent: number; reward_points: number }[] }) =>
      post<Goal>("/v1/goals", body),
    detail: (id: string) => get<Goal>(`/v1/goals/${id}`),
    progress: (id: string) => get<GoalProgress>(`/v1/goals/${id}/progress`),
    review: (id: string) => post<void>(`/v1/goals/${id}/review`),
    remove: (id: string) => del<void>(`/v1/goals/${id}`),
  },

  tasks: {
    list: () => get<Task[]>("/v1/tasks"),
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
    week: () => get<WeekStats>("/v1/stats/week"),
    level: () => get<LevelInfo>("/v1/levels/current"),
    streaks: () => get<Streak[]>("/v1/streaks"),
    achievements: () => get<Achievement[]>("/v1/achievements"),
    analytics: () => get<Analytics>("/v1/analytics/overview"),
    activity: () => get<ActivityEvent[]>("/v1/activity"),
    transactions: () => get<Transaction[]>("/v1/transactions"),
    checkin: (mood: string) => post<void>("/v1/checkin", { mood }),
  },

  penalties: {
    add: (body: { amount: number; reason: string; currency: string; goal_id?: string }) =>
      post<void>("/v1/penalties", body),
  },
}
