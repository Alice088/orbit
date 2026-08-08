import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ListChecks,
  Target,
  Trash2,
} from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "@/lib/api"
import { formatNumber, formatDate } from "@/lib/format"
import { difficultyLabel, goalStatusLabel, milestoneClass, milestoneTitle } from "@/lib/labels"
import { ProgressBar } from "@/components/shared/progress-bar"
import { StatusBadge } from "@/components/shared/status-badge"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TaskCreateDialog } from "@/components/dialogs/task-create-dialog"
import { PenaltyDialog } from "@/components/dialogs/penalty-dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { toast } from "sonner"

export default function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const goal = useQuery({
    queryKey: ["goals", goalId],
    queryFn: () => api.goals.detail(goalId!),
    enabled: !!goalId,
  })
  const progress = useQuery({
    queryKey: ["goals", goalId, "progress"],
    queryFn: () => api.goals.progress(goalId!),
    enabled: !!goalId,
  })
  const tasks = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.tasks.list(),
    select: (page) => (goalId ? page.items.filter((t) => t.goal_id === goalId) : page.items),
  })

  const completeTask = useMutation({
    mutationFn: (taskId: string) => api.tasks.complete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["activity"] })
      toast.success(t("goalDetail.taskCompleted"))
    },
    onError: (err) => toast.error(err.message),
  })

  const removeTask = useMutation({
    mutationFn: (taskId: string) => api.tasks.remove(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["activity"] })
      toast.success(t("goalDetail.taskDeleted"))
    },
    onError: (err) => toast.error(err.message),
  })

  const removeGoal = useMutation({
    mutationFn: () => api.goals.remove(goalId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      navigate("/goals")
      toast.success(t("goalDetail.goalDeleted"))
    },
    onError: (err) => toast.error(err.message),
  })

  if (goal.isLoading || progress.isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const g = goal.data
  const p = progress.data
  if (!g || !p) return null

  const milestones = g.milestones ?? []
  const completed = tasks.data?.filter((t) => t.status === "completed") ?? []
  const open = tasks.data?.filter((t) => t.status === "open") ?? []

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/goals">
          <ArrowLeft className="size-4" />
          {t("goalDetail.backToGoals")}
        </Link>
      </Button>

      <PageHeader
        title={g.title}
        description={t("goalDetail.created", { date: formatDate(g.created_at) })}
        actions={
          <>
            <TaskCreateDialog presetGoalId={g.id} />
            <PenaltyDialog />
            <ConfirmDialog
              title={t("goalDetail.deleteGoalTitle")}
              description={t("goalDetail.deleteGoalDesc", { title: g.title })}
              onConfirm={() => removeGoal.mutate()}
              trigger={
                <Button variant="ghost" size="sm">
                  <Trash2 className="size-4" />
                  {t("common.delete")}
                </Button>
              }
            />
          </>
        }
      />

      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Target className="size-4" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{p.percent}%</p>
                <p className="text-sm text-muted-foreground">
                  {t("goalDetail.earned", { earned: formatNumber(p.earned_gpp), total: formatNumber(g.total_gpp) })}
                </p>
              </div>
            </div>
            <StatusBadge
              label={goalStatusLabel(g.status)}
              variant={g.status === "completed" ? "completed" : g.status === "paused" ? "paused" : "active"}
            />
          </div>
          <ProgressBar value={p.percent} className="h-2" />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t("goalDetail.milestones")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          {milestones.map((m) => {
            const reached = p.percent >= m.percent
            return (
              <div key={m.id} className="flex items-center gap-3">
                <div
                  className={
                    reached
                      ? "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      : "flex size-5 items-center justify-center rounded-full border text-muted-foreground"
                  }
                >
                  {reached && <Check className="size-3" />}
                </div>
                <span className="w-12 text-sm tabular-nums text-muted-foreground">
                  {m.percent}%
                </span>
                {milestoneTitle(m.percent) && (
                  <span className={`text-sm font-medium ${milestoneClass(m.percent)}`}>
                    {milestoneTitle(m.percent)}
                  </span>
                )}
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm tabular-nums">{formatNumber(m.reward_points)} GPP</span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t("goalDetail.tasks")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {tasks.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : open.length === 0 && completed.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("goalDetail.noTasks")}
            </p>
          ) : (
            <>
              {open.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {difficultyLabel(task.difficulty)}
                      {task.gpp_reward > 0 ? ` · +${task.gpp_reward} GPP` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <ConfirmDialog
                      title={t("goalDetail.deleteTaskTitle")}
                      description={t("goalDetail.deleteTaskDesc", { title: task.title })}
                      onConfirm={() => removeTask.mutate(task.id)}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={t("goalDetail.deleteTaskAria")}>
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                    <Button size="sm" onClick={() => completeTask.mutate(task.id)}>
                      <CheckCircle2 className="size-4" />
                      {t("goalDetail.complete")}
                    </Button>
                  </div>
                </div>
              ))}
              {completed.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2.5 opacity-60"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <p className="truncate text-sm font-medium line-through">{task.title}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <ConfirmDialog
                      title={t("goalDetail.deleteCompletedTitle")}
                      description={t("goalDetail.deleteCompletedDesc", { title: task.title })}
                      onConfirm={() => removeTask.mutate(task.id)}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={t("goalDetail.deleteTaskAria")}>
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                  </div>
                </div>
              ))}
            </>
          )}
          {open.length > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ListChecks className="size-3.5" />
              {t("goalDetail.openCount", { open: open.length, completed: completed.length, count: open.length })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
