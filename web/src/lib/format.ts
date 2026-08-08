import i18n, { localeTag } from "@/lib/i18n"

function numberFormatter() {
  return new Intl.NumberFormat(localeTag())
}

export function formatNumber(n: number): string {
  return numberFormatter().format(n)
}

export function formatPoints(n: number): string {
  return numberFormatter().format(n)
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(localeTag(), { day: "numeric", month: "long", year: "numeric" })
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(localeTag(), { day: "numeric", month: "short" })
}

export function weekRangeLabel(days: { day: string }[] | undefined, weeksBack: number): string {
  if (days && days.length > 0) {
    return `${formatShortDate(days[0].day)} – ${formatShortDate(days[days.length - 1].day)}`
  }
  const end = new Date()
  end.setDate(end.getDate() - 7 * weeksBack)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  const fmt = (d: Date) => d.toLocaleDateString(localeTag(), { day: "numeric", month: "short" })
  return `${fmt(start)} – ${fmt(end)}`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(localeTag(), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function timeAgo(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (Number.isNaN(diff)) return ""
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return i18n.t("format.justNow")
  if (minutes < 60) return i18n.t("format.minutes", { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return i18n.t("format.hours", { count: hours })
  const days = Math.floor(hours / 24)
  if (days === 1) return i18n.t("format.yesterday")
  if (days < 7) return i18n.t("format.daysAgo", { count: days })
  return formatShortDate(iso)
}

export function pluralDays(n: number): string {
  return i18n.t("habits.dayCount", { count: n })
}

export function greeting(): string {
  const h = new Date().getHours()
  if (i18n.language === "en") {
    if (h >= 5 && h < 12) return "Good morning"
    if (h >= 12 && h < 18) return "Good afternoon"
    if (h >= 18 && h < 23) return "Good evening"
    return "Good night"
  }
  if (h >= 5 && h < 12) return "Доброе утро"
  if (h >= 12 && h < 18) return "Добрый день"
  if (h >= 18 && h < 23) return "Добрый вечер"
  return "Доброй ночи"
}

export function difficultyMultiplier(difficulty: string): number {
  switch (difficulty) {
    case "easy":
      return 0.5
    case "hard":
      return 1.5
    case "epic":
      return 2
    default:
      return 1
  }
}

export function taskXp(gpp: number, difficulty: string): number {
  const mult = Math.round(difficultyMultiplier(difficulty) * 100)
  return Math.max(1, Math.floor((gpp * mult) / 100))
}
