const nf = new Intl.NumberFormat("ru-RU")

export function formatNumber(n: number): string {
  return nf.format(n)
}

export function formatPoints(n: number): string {
  return nf.format(n)
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
}

export function weekRangeLabel(days: { day: string }[] | undefined, weeksBack: number): string {
  if (days && days.length > 0) {
    return `${formatShortDate(days[0].day)} – ${formatShortDate(days[days.length - 1].day)}`
  }
  return weeksBack === 0 ? "эта неделя" : `−${weeksBack} нед`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("ru-RU", {
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
  if (minutes < 1) return "только что"
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  if (days === 1) return "вчера"
  if (days < 7) return `${days} дн назад`
  return formatShortDate(iso)
}

export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (last > 1 && last < 5) return forms[1]
  if (last === 1) return forms[0]
  return forms[2]
}

export function greeting(): string {
  const h = new Date().getHours()
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
