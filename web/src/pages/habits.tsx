import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Flame, Plus, Repeat, Trash2, CheckCircle2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { api, ApiError } from "@/lib/api"
import { pluralDays } from "@/lib/format"
import { achievementTitle } from "@/lib/labels"
import { nextMilestoneInfo } from "@/lib/milestones"
import { PageHeader, EmptyState } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Award } from "lucide-react"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useEffect } from "react"

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])
  return now
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(h)}:${p(m)}:${p(s)}`
}

function untilMidnight(now: number): number {
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return end.getTime() - now
}

interface MilestoneRow {
  days: string
  bonus: string
  title: string
}

function HabitCreateDialog() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [baseXP, setBaseXP] = useState("5")
  const [category, setCategory] = useState("")
  const [rows, setRows] = useState<MilestoneRow[]>([
    { days: "7", bonus: "5", title: "" },
  ])
  const [error, setError] = useState("")

  const mutation = useMutation({
    mutationFn: () => {
      const list = rows.filter((r) => r.days !== "" || r.bonus !== "")
      return api.habits.create({
        title,
        base_xp: Number(baseXP),
        streak_tracking: true,
        category,
        milestones: list.map((r) => ({
          days: Number(r.days),
          bonus_xp: Number(r.bonus),
          achievement_code: r.title.trim(),
        })),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] })
      setOpen(false)
      toast.success(t("habits.created"))
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : t("habits.errCreate"))
    },
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const base = Number(baseXP)
    const parsed = rows
      .filter((r) => r.days !== "" || r.bonus !== "")
      .map((r) => ({ days: Number(r.days), bonus: Number(r.bonus) }))
    if (!title.trim() || base <= 0) {
      setError(t("habits.errFill"))
      return
    }
    if (rows.filter((r) => r.days !== "" || r.bonus !== "").some((r) => !r.title.trim())) {
      setError(t("habits.errAchievementTitle"))
      return
    }
    if (parsed.some((r) => !Number.isFinite(r.days) || !Number.isFinite(r.bonus) || r.days <= 0 || r.bonus <= 0)) {
      setError(t("habits.errPositive"))
      return
    }
    const sorted = [...parsed].sort((a, b) => a.days - b.days)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].days <= sorted[i - 1].days) {
        setError(t("habits.errDaysAscending"))
        return
      }
    }
    mutation.mutate()
  }

  function setRow(index: number, field: keyof MilestoneRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          {t("habits.create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("habits.create")}</DialogTitle>
          <DialogDescription>
            {t("habits.dialogDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="habit-title">{t("common.title")}</Label>
            <Input
              id="habit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("habits.titlePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="habit-xp">{t("habits.baseXp")}</Label>
              <Input
                id="habit-xp"
                type="number"
                min={1}
                value={baseXP}
                onChange={(e) => setBaseXP(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="habit-category">{t("habits.category")}</Label>
              <Input
                id="habit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t("habits.categoryPlaceholder")}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("habits.milestones")}</Label>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("habits.milestoneHint")}
            </p>
              <div className="flex flex-col gap-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-md border px-2 py-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={row.days}
                        onChange={(e) => setRow(i, "days", e.target.value)}
                        className="w-16"
                        placeholder="7"
                        aria-label={t("habits.daysAria")}
                      />
                      <span className="whitespace-nowrap text-sm text-muted-foreground">{t("habits.daysRow")}</span>
                      <span className="text-sm text-muted-foreground">+</span>
                      <Input
                        type="number"
                        min={1}
                        value={row.bonus}
                        onChange={(e) => setRow(i, "bonus", e.target.value)}
                        className="w-16"
                        placeholder="5"
                        aria-label={t("habits.bonusAria")}
                      />
                      <span className="whitespace-nowrap text-sm text-muted-foreground">XP</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-auto"
                        onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={t("habits.removeMilestoneAria")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <Input
                      value={row.title}
                      onChange={(e) => setRow(i, "title", e.target.value)}
                      placeholder={t("habits.achievementPlaceholder")}
                      aria-label={t("habits.achievementAria")}
                    />
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((prev) => [...prev, { days: "", bonus: "", title: "" }])}
              >
                <Plus className="size-4" />
                {t("habits.addMilestone")}
              </Button>
            </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("common.creating") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function HabitsPage() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const habits = useQuery({ queryKey: ["habits"], queryFn: api.habits.list })
  const streaks = useQuery({ queryKey: ["streaks"], queryFn: api.stats.streaks })
  const streakByHabit = new Map((streaks.data ?? []).map((s) => [s.habit_id, s]))
  const [pendingDone, setPendingDone] = useState<Set<string>>(new Set())
  const anyDone = (habits.data ?? []).some((h) => {
    if (pendingDone.has(h.id)) return true
    return h.last_completed_at ? isSameDay(new Date(h.last_completed_at), new Date()) : false
  })
  const now = useNow(anyDone)

  const complete = useMutation({
    mutationFn: (id: string) => api.habits.complete(id),
    onMutate: (id) => {
      setPendingDone((prev) => new Set(prev).add(id))
    },
    onSuccess: (res) => {
      setPendingDone(new Set())
      queryClient.invalidateQueries({ queryKey: ["habits"] })
      queryClient.invalidateQueries({ queryKey: ["streaks"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["activity"] })
      queryClient.invalidateQueries({ queryKey: ["achievements"] })
      const parts = [`+${res.xp} XP`]
      if (res.bonus_xp) parts.push(t("habits.bonusToast", { n: res.bonus_xp }))
      if (res.streak_days) parts.push(t("habits.streakToast", { count: res.streak_days }))
      if (res.achievement_code)
        parts.push(`${achievementTitle(res.achievement_code)}`)
      toast.success(
        <span className="flex items-center gap-1.5">
          {res.achievement_code && <Award className="size-4" />}
          {parts.join(" · ")}
        </span>,
      )
    },
    onError: (err) => {
      setPendingDone(new Set())
      toast.error(err.message)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.habits.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] })
      queryClient.invalidateQueries({ queryKey: ["streaks"] })
      queryClient.invalidateQueries({ queryKey: ["activity"] })
      toast.success(t("habits.deleted"))
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div>
      <PageHeader
        title={t("habits.title")}
        description={t("habits.subtitle")}
        actions={<HabitCreateDialog />}
      />
      {habits.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !habits.data || habits.data.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title={t("habits.emptyTitle")}
          description={t("habits.emptyDesc")}
          action={<HabitCreateDialog />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {habits.data.map((h) => {
            const s = streakByHabit.get(h.id)
            const next = nextMilestoneInfo(h, s?.current_days ?? 0)
            const done = pendingDone.has(h.id)
              ? true
              : h.last_completed_at
                ? isSameDay(new Date(h.last_completed_at), new Date(now))
                : false
            return (
              <Card key={h.id} className="shadow-none">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Repeat className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{h.title}</p>
                        <p className="text-xs text-muted-foreground">{t("habits.perCompletion", { xp: h.base_xp })}</p>
                      </div>
                    </div>
                    {h.category && <StatusBadge label={h.category} />}
                  </div>
                  {h.streak_tracking ? (
                    <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-sm tabular-nums">
                        <Flame className="size-4 text-muted-foreground" />
                        <span className="font-medium">{s?.current_days ?? 0}</span>
                        <span className="text-xs text-muted-foreground">
                          {pluralDays(s?.current_days ?? 0)}
                        </span>
                      </div>
                      {next ? (
                        <span className="text-xs text-muted-foreground">
                          {t("habits.toMilestone", { days: next.days, bonus: next.bonus_xp, title: next.title })}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("habits.noMilestones")}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("habits.noStreak")}</p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      className={
                        done
                          ? "flex-1 cursor-default bg-gradient-to-r from-green-600 to-emerald-600 text-white transition-all duration-500 hover:from-green-600 hover:to-emerald-600 hover:text-white motion-reduce:transition-none"
                          : "flex-1 transition-all duration-500"
                      }
                      disabled={done || complete.isPending}
                      onClick={() => complete.mutate(h.id)}
                    >
                      {done ? (
                        <>
                          <CheckCircle2 className="size-4" />
                          <span className="tabular-nums">{t("habits.done", { time: formatRemaining(untilMidnight(now)) })}</span>
                        </>
                      ) : (
                        t("habits.complete")
                      )}
                    </Button>
                    <ConfirmDialog
                      title={t("habits.deleteTitle")}
                      description={t("habits.deleteDesc", { title: h.title })}
                      onConfirm={() => remove.mutate(h.id)}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={t("habits.deleteTitle")}>
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
