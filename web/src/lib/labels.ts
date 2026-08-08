import i18n, { isEn } from "@/lib/i18n"

export function goalStatusLabel(status: string): string {
  return i18n.t(`labels.goalStatus.${status}`)
}

export function difficultyLabel(difficulty: string): string {
  return i18n.t(`labels.difficulty.${difficulty}`)
}

export function difficultyMultiplierLabel(difficulty: string): string {
  return i18n.t(`labels.difficultyMultiplier.${difficulty}`)
}

export function difficultyOptions(): { value: string; label: string; multiplier: string }[] {
  return ["easy", "normal", "hard", "epic"].map((value) => ({
    value,
    label: difficultyLabel(value),
    multiplier: difficultyMultiplierLabel(value),
  }))
}

export function taskStatusLabel(status: string): string {
  return i18n.t(`labels.taskStatus.${status}`)
}

export function reasonLabel(reason: string): string {
  return i18n.t(`labels.reason.${reason}`)
}

export function eventLabel(eventType: string): string {
  return i18n.t(`labels.event.${eventType}`)
}

export function achievementTitle(code: string): string {
  const known = i18n.exists(`labels.achievement.${code}`)
  const title = known ? i18n.t(`labels.achievement.${code}`) : code
  if (isEn()) return title.replace(/ урв\./g, " lvl.")
  return title
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
      if (typeof event.payload.title === "string" && event.payload.title)
        parts.push(event.payload.title)
      if (typeof event.payload.awarded === "number" && event.payload.awarded > 0)
        parts.push(`+${event.payload.awarded} XP`)
      if (typeof event.payload.streak_days === "number" && event.payload.streak_days > 0)
        parts.push(i18n.t("labels.streakDays", { count: event.payload.streak_days }))
      return parts.join(" · ")
    }
    case "goal_created": {
      const parts: string[] = []
      if (typeof event.payload.title === "string" && event.payload.title)
        parts.push(event.payload.title)
      if (typeof event.payload.total_gpp === "number" && event.payload.total_gpp > 0)
        parts.push(`${event.payload.total_gpp} GPP`)
      return parts.join(" · ")
    }
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
    }
    case "achievement_unlocked":
      return event.payload.habit_id ? i18n.t("labels.newAchievement") : ""
    default:
      return ""
  }
}

export function currencyLabel(currency: string): string {
  return currency === "gpp" ? "GPP" : "XP"
}
