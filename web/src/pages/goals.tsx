import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, Plus, Target, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { api, ApiError, type Goal, type GoalProgress } from "@/lib/api"
import { formatNumber, formatDate } from "@/lib/format"
import { goalStatusLabel } from "@/lib/labels"
import { PageHeader, EmptyState } from "@/components/shared/page-header"
import { ProgressBar } from "@/components/shared/progress-bar"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

interface MilestoneRow {
  percent: string
}

function autoReward(percent: number, total: number): number {
  return Math.round((percent * total) / 100)
}

function GoalCreateDialog({ onCreated }: { onCreated?: () => void }) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [total, setTotal] = useState("1000")
  const [rows, setRows] = useState<MilestoneRow[]>([
    { percent: "0" },
    { percent: "10" },
    { percent: "20" },
    { percent: "100" },
  ])
  const [error, setError] = useState("")

  const totalNum = Number(total) || 0
  const rewardFor = (percent: number) => autoReward(percent, totalNum)

  const mutation = useMutation({
    mutationFn: () =>
      api.goals.create({
        title,
        total_gpp: totalNum,
        milestones: rows.map((r) => ({
          percent: Number(r.percent),
          reward_points: autoReward(Number(r.percent), totalNum),
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      setOpen(false)
      toast.success(t("goals.created"))
      onCreated?.()
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : t("goals.errCreate"))
    },
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const parsed = rows.map((r) => ({
      percent: Number(r.percent),
      reward: autoReward(Number(r.percent), totalNum),
    }))
    if (!title.trim() || totalNum <= 0) {
      setError(t("goals.errFill"))
      return
    }
    if (parsed.some((r) => !Number.isFinite(r.percent) || !Number.isFinite(r.reward))) {
      setError(t("goals.errNumbers"))
      return
    }
    const hasZero = parsed.some((r) => r.percent === 0)
    const hasHundred = parsed.some((r) => r.percent === 100)
    if (!hasZero || !hasHundred) {
      setError(t("goals.errZeroHundred"))
      return
    }
    const hundred = parsed.find((r) => r.percent === 100)
    if (hundred && hundred.reward !== totalNum) {
      setError(t("goals.errHundredReward"))
      return
    }
    const sorted = [...parsed].sort((a, b) => a.percent - b.percent)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].percent <= sorted[i - 1].percent) {
        setError(t("goals.errAscending"))
        return
      }
      if (sorted[i].reward <= sorted[i - 1].reward) {
        setError(t("goals.errCollision"))
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
          {t("goals.create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("goals.new")}</DialogTitle>
          <DialogDescription>
            {t("goals.dialogDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-title">{t("common.title")}</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("goals.titlePlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-total">{t("goals.total")}</Label>
            <Input
              id="goal-total"
              type="number"
              min={1}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("goals.milestones")}</Label>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("goals.milestoneHint")}
            </p>
            <div className="flex flex-col gap-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={row.percent}
                    onChange={(e) => setRow(i, "percent", e.target.value)}
                    className="w-20"
                    aria-label={t("goals.percentAria")}
                  />
                  <span className="text-sm text-muted-foreground">% →</span>
                  <Input
                    type="number"
                    min={0}
                    value={String(rewardFor(Number(row.percent)))}
                    disabled
                    className="flex-1"
                    aria-label={t("goals.rewardAria")}
                  />
                  <span className="w-8 text-sm text-muted-foreground">GPP</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={t("goals.removeMilestoneAria")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((prev) => [...prev, { percent: "" }])}
            >
              <Plus className="size-4" />
              {t("goals.addMilestone")}
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

function GoalList({ items, progress }: { items: Goal[]; progress: GoalProgress[] | undefined }) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((g) => {
        const prog = progress?.find((p) => p.goal_id === g.id)
        return (
          <Link key={g.id} to={`/goals/${g.id}`} className="group block">
            <Card className="shadow-none transition-colors hover:bg-accent/40">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Target className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium group-hover:underline">
                      {g.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(g.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:max-w-md sm:flex-none sm:flex-1">
                  <ProgressBar value={prog?.percent ?? 0} className="max-w-xs flex-1" />
                  <span className="w-10 text-right text-sm tabular-nums">
                    {prog?.percent ?? 0}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatNumber(prog?.earned_gpp ?? 0)} / {formatNumber(g.total_gpp)} GPP
                  </span>
                  <StatusBadge
                    label={goalStatusLabel(g.status)}
                    variant={
                      g.status === "completed"
                        ? "completed"
                        : g.status === "paused"
                          ? "paused"
                          : "active"
                    }
                  />
                  <ArrowRight className="size-4 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

export default function GoalsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState("active")
  const goals = useQuery({ queryKey: ["goals"], queryFn: api.goals.list })
  const progress = useQuery({
    queryKey: ["goals", "progress"],
    queryFn: async () => {
      const list = await api.goals.list()
      return Promise.all(list.map((g) => api.goals.progress(g.id)))
    },
    enabled: goals.data ? goals.data.length > 0 : false,
  })

  const activeGoals = (goals.data ?? []).filter((g) => g.status !== "completed")
  const completedGoals = (goals.data ?? []).filter((g) => g.status === "completed")

  return (
    <div>
      <PageHeader
        title={t("goals.title")}
        description={t("goals.subtitle")}
        actions={<GoalCreateDialog />}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">{t("goals.activeTab")}</TabsTrigger>
          <TabsTrigger value="completed">{t("goals.completedTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          {goals.isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : activeGoals.length === 0 ? (
            <EmptyState
              icon={Target}
              title={t("goals.emptyTitle")}
              description={t("goals.emptyDesc")}
              action={<GoalCreateDialog />}
            />
          ) : (
            <GoalList items={activeGoals} progress={progress.data} />
          )}
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          {goals.isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : completedGoals.length === 0 ? (
            <EmptyState
              icon={Target}
              title={t("goals.emptyCompletedTitle")}
              description={t("goals.emptyCompletedDesc")}
            />
          ) : (
            <GoalList items={completedGoals} progress={progress.data} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
