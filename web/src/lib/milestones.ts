import { achievementTitle } from "@/lib/labels"

export function scaledThreshold(base: number, level: number): number {
  let t = base
  for (let l = 2; l <= level; l++) t = Math.ceil((t * 3) / 2)
  return t
}

export function nextMilestoneInfo(
  habit: {
    title: string
    milestones: { days: number; bonus_xp: number; achievement_code?: string }[]
  },
  streakDays: number,
): { level: number; days: number; bonus_xp: number; title: string } | null {
  const candidates: { level: number; days: number; bonus_xp: number; title: string }[] = []
  for (const m of habit.milestones ?? []) {
    let level = 1
    while (scaledThreshold(m.days, level + 1) <= streakDays) level++
    const next = level + 1
    candidates.push({
      level: next,
      days: scaledThreshold(m.days, next),
      bonus_xp: scaledThreshold(m.bonus_xp, next),
      title: next === 1 ? achievementTitle(m.achievement_code ?? "") : `${habit.title} урв.${next}`,
    })
  }
  candidates.sort((a, b) => a.days - b.days)
  return candidates[0] ?? null
}
