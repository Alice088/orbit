import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, FlaskConical, Play, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { api, type ExperimentVersion } from "@/lib/api"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ExperimentFormDialog } from "@/components/dialogs/experiment-form-dialog"
import { formatChange, primaryLine, statusLabel, statusVariant } from "@/lib/experiments"
import { toast } from "sonner"

export default function ExperimentDetailPage() {
  const { experimentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const exp = useQuery({
    queryKey: ["experiments", experimentId],
    queryFn: () => api.experiments.detail(experimentId!),
    enabled: Boolean(experimentId),
  })
  const [editOpen, setEditOpen] = useState(false)
  const [editVersion, setEditVersion] = useState<ExperimentVersion | undefined>()

  useEffect(() => {
    if (!location.state?.openVersionEditor || !exp.data) return
    const cur = exp.data.current
    if (!cur || cur.status !== "draft") return
    navigate(location.pathname, { replace: true, state: null })
    api.experiments
      .version(exp.data.id, cur.id)
      .then((v) => {
        setEditVersion(v)
        setEditOpen(true)
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)))
  }, [location.state, exp.data, navigate, location.pathname])

  const fork = useMutation({
    mutationFn: () => api.experiments.fork(experimentId!),
    onSuccess: (v) => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] })
      setEditVersion(v)
      setEditOpen(true)
    },
    onError: (err) => toast.error(err.message),
  })

  const openEditDraft = async () => {
    if (!current || current.status !== "draft") return
    try {
      const v = await api.experiments.version(experimentId!, current.id)
      setEditVersion(v)
      setEditOpen(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const start = useMutation({
    mutationFn: (versionId: string) => api.experiments.start(experimentId!, versionId),
    onSuccess: (v) => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] })
      navigate(`/experiments/${experimentId}/versions/${v.id}`)
    },
    onError: (err) => toast.error(err.message),
  })

  const remove = useMutation({
    mutationFn: () => api.experiments.remove(experimentId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] })
      navigate("/experiments")
    },
    onError: (err) => toast.error(err.message),
  })

  if (exp.isLoading || !exp.data) {
    return (
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    )
  }

  const e = exp.data
  const current = e.current

  return (
    <div>
      <Link
        to="/experiments"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("common.back")}
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{e.title}</h2>
            {current && (
              <StatusBadge label={statusLabel(t, current.status)} variant={statusVariant(current.status)} />
            )}
            {e.best && (
              <StatusBadge
                label={`${t("experiments.best")} ${formatChange(e.best.change_pct ?? 0)}`}
                variant="completed"
              />
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("experiments.versionsCount", { n: e.total_versions })} ·{" "}
            {t("experiments.activeCount", { n: e.active_count })} ·{" "}
            {t("experiments.completedCount", { n: e.completed_count })}
            {e.aborted_count > 0 && ` · ${t("experiments.abortedCount", { n: e.aborted_count })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => fork.mutate()}>
            <Plus className="size-4" />
            {t("experiments.newVersion")}
          </Button>
          <ConfirmDialog
            title={t("experiments.deleteTitle")}
            description={t("experiments.deleteDesc", { title: e.title })}
            onConfirm={() => remove.mutate()}
            trigger={
              <Button size="sm" variant="ghost" aria-label={t("experiments.deleteTitle")}>
                <Trash2 className="size-4" />
              </Button>
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {e.versions.map((v) => (
          <Card key={v.id} className="shadow-none transition-colors hover:border-primary/40">
            <CardContent
              className="flex cursor-pointer flex-col gap-3 p-4"
              onClick={() => navigate(`/experiments/${e.id}/versions/${v.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FlaskConical className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{t("experiments.versionLabel", { n: v.version_number })}</p>
                      <StatusBadge label={statusLabel(t, v.status)} variant={statusVariant(v.status)} />
                      {v.is_best && (
                        <StatusBadge label={t("experiments.best")} variant="completed" />
                      )}
                      {v.is_current && v.status !== "draft" && (
                        <StatusBadge label={t("experiments.current")} variant="active" />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{v.change || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {v.status === "draft" && v.is_current && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        void openEditDraft()
                      }}
                    >
                      {t("experiments.editDraft")}
                    </Button>
                  )}
                  {v.status === "draft" && v.is_current && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        start.mutate(v.id)
                      }}
                    >
                      <Play className="size-4" />
                      {t("experiments.start")}
                    </Button>
                  )}
                </div>
              </div>
              {v.primary_summary && (
                <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
                  <span className="tabular-nums">{primaryLine(v.primary_summary)}</span>
                  <span className="flex items-center gap-3">
                    {v.primary_summary.change_pct != null && (
                      <span
                        className={`tabular-nums font-medium ${
                          v.primary_summary.change_pct <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {formatChange(v.primary_summary.change_pct)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {t("experiments.consistency", { pct: Math.round(v.primary_summary.consistency * 100) })}
                    </span>
                  </span>
                </div>
              )}
              {(v.status === "running" || v.status === "ended") && (
                <p className="text-xs text-muted-foreground">
                  {t("experiments.dayOf", { n: v.day_index, total: v.duration_days })}
                  {v.status === "running" && v.days_left > 0 && ` · ${t("experiments.daysLeft", { n: v.days_left })}`}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ExperimentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        experiment={e}
        version={editVersion}
        onSaved={(expId, versionId, started) => {
          if (started) {
            navigate(`/experiments/${expId}/versions/${versionId}`)
          } else {
            navigate(`/experiments/${expId}`)
          }
        }}
      />
    </div>
  )
}
