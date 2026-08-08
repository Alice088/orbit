import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, Plus, Target, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { api, ApiError } from "@/lib/api"
import { formatNumber, formatDate } from "@/lib/format"
import { goalStatusLabel } from "@/lib/labels"
import { PageHeader, EmptyState } from "@/components/shared/page-header"
import { ProgressBar } from "@/components/shared/progress-bar"
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
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface MilestoneRow {
  percent: string
  reward: string
}

function autoReward(percent: number, total: number): number {
  return Math.round((percent * total) / 100)
}

function GoalCreateDialog({ onCreated }: { onCreated?: () => void }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [total, setTotal] = useState("1000")
  const [autoCalc, setAutoCalc] = useState(true)
  const [rows, setRows] = useState<MilestoneRow[]>([
    { percent: "0", reward: "0" },
    { percent: "10", reward: "100" },
    { percent: "20", reward: "200" },
    { percent: "100", reward: "1000" },
  ])
  const [error, setError] = useState("")

  const totalNum = Number(total) || 0
  const rewardFor = (percent: number) => (autoCalc ? autoReward(percent, totalNum) : 0)

  const mutation = useMutation({
    mutationFn: () =>
      api.goals.create({
        title,
        total_gpp: totalNum,
        milestones: rows.map((r) => ({
          percent: Number(r.percent),
          reward_points: autoCalc ? autoReward(Number(r.percent), totalNum) : Number(r.reward),
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      setOpen(false)
      toast.success("Цель создана")
      onCreated?.()
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Не удалось создать цель")
    },
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const parsed = rows.map((r) => ({
      percent: Number(r.percent),
      reward: autoCalc ? autoReward(Number(r.percent), totalNum) : Number(r.reward),
    }))
    if (!title.trim() || totalNum <= 0) {
      setError("Заполни название и общий объём цели")
      return
    }
    if (parsed.some((r) => !Number.isFinite(r.percent) || !Number.isFinite(r.reward))) {
      setError("Проверь вехи — нужны числа")
      return
    }
    const hasZero = parsed.some((r) => r.percent === 0)
    const hasHundred = parsed.some((r) => r.percent === 100)
    if (!hasZero || !hasHundred) {
      setError("Нужны вехи 0% и 100%")
      return
    }
    const hundred = parsed.find((r) => r.percent === 100)
    if (hundred && hundred.reward !== totalNum) {
      setError("Награда вехи 100% должна равняться общему объёму цели")
      return
    }
    const sorted = [...parsed].sort((a, b) => a.percent - b.percent)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].percent <= sorted[i - 1].percent) {
        setError("Проценты вех должны идти по возрастанию")
        return
      }
      if (sorted[i].reward <= sorted[i - 1].reward) {
        setError(autoCalc ? "Слишком малый объём — награды вех совпадают. Увеличь GPP." : "Награды вех должны возрастать")
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
          Создать цель
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Новая цель</DialogTitle>
          <DialogDescription>
            Прогресс цели измеряется в GPP. Вехи задают точки отсчёта.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-title">Название</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Космическая компания"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-total">Общий объём, GPP</Label>
            <Input
              id="goal-total"
              type="number"
              min={1}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Авто-расчёт наград</p>
              <p className="text-xs text-muted-foreground">
                Награда вехи = процент × объём цели
              </p>
            </div>
            <Switch checked={autoCalc} onCheckedChange={setAutoCalc} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Вехи</Label>
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
                    aria-label="Процент вехи"
                  />
                  <span className="text-sm text-muted-foreground">% →</span>
                  <Input
                    type="number"
                    min={0}
                    value={autoCalc ? String(rewardFor(Number(row.percent))) : row.reward}
                    disabled={autoCalc}
                    onChange={(e) => setRow(i, "reward", e.target.value)}
                    className="flex-1"
                    aria-label="Награда вехи"
                  />
                  <span className="w-8 text-sm text-muted-foreground">GPP</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="Удалить веху"
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
              onClick={() => setRows((prev) => [...prev, { percent: "", reward: "" }])}
            >
              <Plus className="size-4" />
              Добавить веху
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Создание…" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function GoalsPage() {
  const goals = useQuery({ queryKey: ["goals"], queryFn: api.goals.list })
  const progress = useQuery({
    queryKey: ["goals", "progress"],
    queryFn: async () => {
      const list = await api.goals.list()
      return Promise.all(list.map((g) => api.goals.progress(g.id)))
    },
    enabled: goals.data ? goals.data.length > 0 : false,
  })

  return (
    <div>
      <PageHeader
        title="Цели"
        description="Стратегические направления. Прогресс измеряется в GPP."
        actions={<GoalCreateDialog />}
      />
      {goals.isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : !goals.data || goals.data.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Целей пока нет"
          description="Создай первую цель — разбей путь на вехи и начни накапливать GPP."
          action={<GoalCreateDialog />}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {goals.data.map((g) => {
            const prog = progress.data?.find((p) => p.goal_id === g.id)
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
                        label={goalStatusLabel[g.status] ?? g.status}
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
      )}
    </div>
  )
}
