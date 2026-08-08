export const goalStatusLabel: Record<string, string> = {
  active: "Активная",
  paused: "На паузе",
  completed: "Завершена",
}

export const difficultyLabel: Record<string, string> = {
  easy: "Лёгкая",
  normal: "Обычная",
  hard: "Сложная",
  epic: "Эпическая",
}

export const difficultyMultiplierLabel: Record<string, string> = {
  easy: "×0.5",
  normal: "×1",
  hard: "×1.5",
  epic: "×2",
}

export const taskStatusLabel: Record<string, string> = {
  open: "Открыта",
  completed: "Выполнена",
}

export const reasonLabel: Record<string, string> = {
  task_completed: "Задача выполнена",
  habit_completed: "Привычка выполнена",
  streak_milestone: "Бонус серии",
  habit_missed_twice: "Пропуск дважды",
  inactivity: "Длительная неактивность",
  goal_regression: "Регресс цели",
  manual_penalty: "Штраф",
}

export const eventLabel: Record<string, string> = {
  task_completed: "Задача выполнена",
  task_regressed: "Задача откачена",
  task_deleted: "Задача удалена",
  habit_completed: "Привычка выполнена",
  habit_deleted: "Привычка удалена",
  goal_created: "Цель создана",
  goal_reviewed: "Цель пересмотрена",
  goal_deleted: "Цель удалена",
  manual_checkin: "Чекин",
  manual_penalty: "Штраф",
  daily_settlement: "Ежедневный расчёт",
  inactivity_penalty: "Штраф за неактивность",
  achievement_unlocked: "Достижение открыто",
  streak_advanced: "Серия продлена",
}

export const ACHIEVEMENTS: { code: string; title: string }[] = [
  { code: "reading_7", title: "Неделя чтения" },
  { code: "reading_30", title: "Месяц чтения" },
  { code: "reading_100", title: "100 дней чтения" },
  { code: "workout_7", title: "Неделя тренировок" },
  { code: "workout_30", title: "Месяц тренировок" },
  { code: "workout_100", title: "100 дней тренировок" },
]

export function achievementTitle(code: string): string {
  return ACHIEVEMENTS.find((a) => a.code === code)?.title ?? code
}

export function eventDescription(event: {
  event_type: string
  payload: Record<string, unknown>
}): string {
  switch (event.event_type) {
    case "task_completed": {
      const parts: string[] = []
      if (typeof event.payload.gpp === "number" && event.payload.gpp > 0)
        parts.push(`+${event.payload.gpp} GPP`)
      if (typeof event.payload.xp === "number" && event.payload.xp > 0)
        parts.push(`+${event.payload.xp} XP`)
      return parts.join(" · ")
    }
    case "task_regressed":
      return typeof event.payload.amount === "number" ? `−${event.payload.amount} GPP` : ""
    case "habit_completed": {
      const parts: string[] = []
      if (typeof event.payload.awarded === "number" && event.payload.awarded > 0)
        parts.push(`+${event.payload.awarded} XP`)
      if (typeof event.payload.streak_days === "number" && event.payload.streak_days > 0)
        parts.push(`серия ${event.payload.streak_days} дн`)
      return parts.join(" · ")
    }
    case "goal_created":
      return typeof event.payload.total_gpp === "number"
        ? `${event.payload.total_gpp} GPP`
        : ""
    case "daily_settlement":
    case "inactivity_penalty":
      return "-10 XP"
    case "manual_penalty": {
      const parts: string[] = []
      if (typeof event.payload.amount === "number" && event.payload.amount > 0) {
        const cur = event.payload.currency === "gpp" ? "GPP" : "XP"
        parts.push(`−${event.payload.amount} ${cur}`)
      }
      if (typeof event.payload.reason === "string" && event.payload.reason) {
        parts.push(event.payload.reason)
      }
      return parts.join(" · ")
    }    case "achievement_unlocked":
      return event.payload.habit_id ? "новое достижение" : ""
    default:
      return ""
  }
}

export function currencyLabel(currency: string): string {
  return currency === "gpp" ? "GPP" : "XP"
}
