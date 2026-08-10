import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { FlaskConical, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { api, type Experiment } from "@/lib/api"
import { PageHeader, EmptyState } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ExperimentFormDialog } from "@/components/dialogs/experiment-form-dialog"
import { formatChange, statusVariant, statusLabel, primaryLine } from "@/lib/experiments"

function ExperimentCard({ exp, onClick }: { exp: Experiment; onClick: () => void }) {
  const { t } = useTranslation()
  const cur = exp.current
  return (
    <Card className="shadow-none transition-colors hover:border-primary/40" onClick={onClick}>
      <CardContent className="flex cursor-pointer flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FlaskConical className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{exp.title}</p>
              <p className="text-xs text-muted-foreground">{t("experiments.versionsCount", { n: exp.total_versions })}</p>
            </div>
          </div>
          {cur && (
            <StatusBadge label={statusLabel(t, cur.status)} variant={statusVariant(cur.status)} />
          )}
        </div>
        {cur?.primary_summary && (
          <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
            <span className="tabular-nums">{primaryLine(cur.primary_summary)}</span>
            {cur.primary_summary.change_pct != null && (
              <span className={`tabular-nums font-medium ${cur.primary_summary.change_pct <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                {formatChange(cur.primary_summary.change_pct)}
              </span>
            )}
          </div>
        )}
        {cur && (cur.status === "running" || cur.status === "ended") && (
          <p className="text-xs text-muted-foreground">
            {t("experiments.dayOf", { n: cur.day_index, total: cur.duration_days })}
            {cur.status === "running" && cur.days_left > 0 && ` · ${t("experiments.daysLeft", { n: cur.days_left })}`}
          </p>
        )}
        {exp.best && (
          <p className="text-xs text-muted-foreground">
            {t("experiments.bestLine", {
              n: exp.best.version_id.slice(0, 4),
              change: formatChange(exp.best.change_pct ?? 0),
            })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function ExperimentsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const experiments = useQuery({ queryKey: ["experiments"], queryFn: api.experiments.list })
  const [createOpen, setCreateOpen] = useState(false)

  const active = experiments.data?.reduce((n, e) => n + e.active_count, 0) ?? 0
  const completed = experiments.data?.reduce((n, e) => n + e.completed_count, 0) ?? 0

  return (
    <div>
      <PageHeader
        title={t("experiments.title")}
        description={t("experiments.subtitle")}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t("experiments.create")}
          </Button>
        }
      />
      <div className="mb-6 flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          {t("experiments.activeCount", { n: active })}
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span>
          {t("experiments.completedCount", { n: completed })}
        </span>
      </div>
      {experiments.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !experiments.data || experiments.data.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={t("experiments.emptyTitle")}
          description={t("experiments.emptyDesc")}
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t("experiments.create")}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {experiments.data.map((exp) => (
            <ExperimentCard
              key={exp.id}
              exp={exp}
              onClick={() => navigate(`/experiments/${exp.id}`)}
            />
          ))}
        </div>
      )}
      <ExperimentFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(expId) => {
          navigate(`/experiments/${expId}`, { state: { openVersionEditor: true } })
        }}
      />
    </div>
  )
}
