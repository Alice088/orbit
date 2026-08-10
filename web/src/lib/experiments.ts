import type { PrimarySummary, VersionStatus } from "@/lib/api"

export function formatChange(pct: number): string {
  if (Math.abs(pct) < 0.5) return "0%"
  const sign = pct > 0 ? "+" : "−"
  return `${sign}${Math.abs(pct).toFixed(0)}%`
}

export function statusVariant(status: VersionStatus): "active" | "completed" | "paused" | "neutral" {
  switch (status) {
    case "running":
      return "active"
    case "completed":
      return "completed"
    case "draft":
      return "neutral"
    default:
      return "paused"
  }
}

export function statusLabel(
  t: (key: string, opts?: Record<string, unknown>) => string,
  status: VersionStatus,
): string {
  return t(`experiments.status.${status}`)
}

export function primaryLine(s: PrimarySummary): string {
  const avg = s.average != null ? Number(s.average.toFixed(2)) : "—"
  return `${avg} · ${s.metric_name}`
}

export function formatMetricValue(
  type: string,
  num: number | undefined,
  denom: number | undefined,
  unit?: string,
): string {
  switch (type) {
    case "rate":
      if (num == null) return "—"
      return `${num}/${denom ?? "—"}`
    case "score":
      if (num == null) return "—"
      return `${num}/5`
    case "binary":
      if (num == null) return "—"
      return num === 1 ? "✓" : "✗"
    case "note":
      return ""
    case "duration":
    case "count":
    default:
      if (num == null) return "—"
      return unit ? `${num} ${unit}` : String(num)
  }
}

export function isToday(day: string): boolean {
  const d = new Date(day + "T00:00:00")
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function todayKey(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
