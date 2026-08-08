import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, ListChecks, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { api } from "@/lib/api"
import { difficultyLabel } from "@/lib/labels"
import { formatNumber } from "@/lib/format"
import { PageHeader, EmptyState } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaskCreateDialog } from "@/components/dialogs/task-create-dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Pagination } from "@/components/shared/pagination"
import { toast } from "sonner"

type Filter = "all" | "open" | "completed"

export default function TasksPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<Filter>("all")
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const tasks = useQuery({
    queryKey: ["tasks", filter, page],
    queryFn: () => api.tasks.list(filter, 20, (page - 1) * 20),
  })
  const goals = useQuery({ queryKey: ["goals"], queryFn: api.goals.list })
  const goalTitle = new Map((goals.data ?? []).map((g) => [g.id, g.title]))

  const complete = useMutation({
    mutationFn: (id: string) => api.tasks.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["activity"] })
      toast.success(t("tasks.completedToast"))
    },
    onError: (err) => toast.error(err.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.tasks.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["activity"] })
      toast.success(t("tasks.deleted"))
    },
    onError: (err) => toast.error(err.message),
  })

  const shown = (tasks.data?.items ?? []).filter((t) => {
    if (filter === "open") return t.status === "open"
    if (filter === "completed") return t.status === "completed"
    return true
  })

  return (
    <div>
      <PageHeader
        title={t("tasks.title")}
        description={t("tasks.subtitle")}
        actions={<TaskCreateDialog />}
      />
      <Tabs
        value={filter}
        onValueChange={(v) => {
          setFilter(v as Filter)
          setPage(1)
        }}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="all">{t("tasks.all")}</TabsTrigger>
          <TabsTrigger value="open">{t("tasks.open")}</TabsTrigger>
          <TabsTrigger value="completed">{t("tasks.completed")}</TabsTrigger>
        </TabsList>
      </Tabs>
      {tasks.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={t("tasks.emptyTitle")}
          description={
            tasks.data && tasks.data.total === 0
              ? t("tasks.emptyFirst")
              : t("tasks.emptyFilter")
          }
          action={<TaskCreateDialog />}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((task) => (
            <Card key={task.id} className="shadow-none">
              <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p
                    className={
                      task.status === "completed"
                        ? "truncate text-sm font-medium text-muted-foreground line-through"
                        : "truncate text-sm font-medium"
                    }
                  >
                    {task.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {goalTitle.get(task.goal_id) ?? "—"} · {difficultyLabel(task.difficulty)}
                  </p>
                  {task.gpp_reward > 0 && (
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      +{formatNumber(task.gpp_reward)} GPP
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge
                    label={task.status === "completed" ? t("tasks.statusCompleted") : t("tasks.statusOpen")}
                    variant={task.status === "completed" ? "completed" : "active"}
                  />
                  {task.status === "open" && (
                    <>
                      <Button size="sm" onClick={() => complete.mutate(task.id)}>
                        <CheckCircle2 className="size-4" />
                        {t("tasks.complete")}
                      </Button>
                    </>
                  )}
                  <ConfirmDialog
                    title={t("tasks.deleteTitle")}
                    description={
                      task.status === "completed"
                        ? t("tasks.deleteDescCompleted", { title: task.title })
                        : t("tasks.deleteDesc", { title: task.title })
                    }
                    onConfirm={() => remove.mutate(task.id)}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={t("goalDetail.deleteTaskAria")}>
                        <Trash2 className="size-4" />
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {tasks.data && tasks.data.total > 20 && (
        <div className="mt-4">
          <Pagination page={page} total={tasks.data.total} limit={20} onChange={setPage} />
        </div>
      )}
    </div>
  )
}
