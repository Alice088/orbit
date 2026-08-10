import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, FlaskConical, Star, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { api, type CheckinValue, type ExperimentVersion, type Metric } from "@/lib/api"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { formatChange, formatMetricValue, statusLabel, statusVariant, todayKey } from "@/lib/experiments"
import { formatShortDate } from "@/lib/format"
import { toast } from "sonner"

function CheckinForm({
  version,
  onSaved,
}: {
  version: ExperimentVersion
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const day = todayKey()
  const existing = version.checkins.find((c) => c.day === day)
  const [note, setNote] = useState(existing?.note ?? "")
  const [values, setValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const c of version.checkins) {
      if (c.day !== day) continue
      for (const v of c.values) {
        if (v.text_value != null) {
          map[v.metric_id] = v.text_value
        } else if (v.num_value != null) {
          if (v.denom_value != null) {
            map[`${v.metric_id}:num`] = String(v.num_value)
            map[`${v.metric_id}:den`] = String(v.denom_value)
          } else {
            map[v.metric_id] = String(v.num_value)
          }
        }
      }
    }
    return map
  })
  const [error, setError] = useState("")

  useEffect(() => {
    setNote(existing?.note ?? "")
  }, [existing?.id, existing?.note, day])

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CheckinValue[] = []
      for (const m of version.metrics) {
        const key = m.id
        const numRaw = m.type === "rate" ? values[`${key}:num`] : values[key]
        const denRaw = values[`${key}:den`]
        if (m.type === "note") {
          const text = (values[key] ?? "").trim()
          if (text) payload.push({ metric_id: m.id, text_value: text })
          continue
        }
        if (numRaw === undefined || numRaw === "") continue
        payload.push({
          metric_id: m.id,
          num_value: Number(numRaw),
          ...(m.type === "rate" ? { denom_value: Number(denRaw) } : {}),
        })
      }
      return api.experiments.upsertCheckin(version.experiment_id, version.id, day, {
        values: payload,
        note,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] })
      toast.success(t("experiments.checkinSaved"))
      onSaved()
    },
    onError: (err) => setError(err instanceof Error ? err.message : String(err)),
  })

  const primary = version.metrics.find((m) => m.is_primary)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (primary) {
      const key = primary.type === "rate" ? `${primary.id}:num` : primary.id
      const raw = values[key]
      if (raw === undefined || raw === "") {
        setError(t("experiments.errPrimaryValue"))
        return
      }
      if (primary.type === "rate" && (values[`${primary.id}:den`] ?? "") === "") {
        setError(t("experiments.errPrimaryValue"))
        return
      }
    }
    mutation.mutate()
  }

  return (
    <Card className="shadow-none">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{t("experiments.checkinTitle")}</p>
          {existing && <StatusBadge label={t("experiments.checkinDone")} variant="completed" />}
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {version.metrics.map((m) => (
            <MetricField key={m.id} metric={m} values={values} setValues={setValues} />
          ))}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="checkin-note">{t("experiments.note")}</Label>
            <Textarea
              id="checkin-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("experiments.notePlaceholder")}
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? t("common.saving") : t("experiments.saveCheckin")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function MetricField({
  metric,
  values,
  setValues,
}: {
  metric: Metric
  values: Record<string, string>
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
}) {
  const { t } = useTranslation()
  const set = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }))
  const isRate = metric.type === "rate"
  const numKey = isRate ? `${metric.id}:num` : metric.id
  const denKey = `${metric.id}:den`
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {metric.is_primary && <Star className="mr-1 inline size-3.5 text-amber-500" />}
        {metric.name}
        {metric.is_primary && ` · ${t("experiments.primary")}`}
      </Label>
      {metric.type === "note" ? (
        <Textarea
          value={values[metric.id] ?? ""}
          onChange={(e) => set(metric.id, e.target.value)}
          placeholder={t("experiments.notePlaceholder")}
          rows={2}
        />
      ) : metric.type === "binary" ? (
        <Select value={values[metric.id] ?? ""} onValueChange={(v) => set(metric.id, v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("experiments.choose")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">{t("experiments.yes")}</SelectItem>
            <SelectItem value="0">{t("experiments.no")}</SelectItem>
          </SelectContent>
        </Select>
      ) : metric.type === "score" ? (
        <Select value={values[metric.id] ?? ""} onValueChange={(v) => set(metric.id, v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("experiments.choose")} />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}/5
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step="any"
            value={values[numKey] ?? ""}
            onChange={(e) => set(numKey, e.target.value)}
            placeholder="0"
            className="w-28"
          />
          {isRate && (
            <>
              <span className="text-sm text-muted-foreground">/</span>
              <Input
                type="number"
                min={1}
                step="any"
                value={values[denKey] ?? ""}
                onChange={(e) => set(denKey, e.target.value)}
                placeholder={t("experiments.denominator")}
                className="w-28"
              />
            </>
          )}
          {metric.unit && <span className="text-sm text-muted-foreground">{metric.unit}</span>}
        </div>
      )}
    </div>
  )
}

function MetricStatsCard({ metric }: { metric: Metric }) {
  const { t } = useTranslation()
  const s = metric.stats
  if (!s) return null
  const change = s.change_pct
  const good = change != null && (metric.direction === "lower_better" ? change < 0 : change > 0)
  return (
    <Card className="shadow-none">
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          {metric.is_primary && <Star className="size-3.5 text-amber-500" />}
          <p className="truncate text-sm font-medium">{metric.name}</p>
          {metric.type !== "note" && metric.unit && (
            <span className="text-xs text-muted-foreground">{metric.unit}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">
            {t("experiments.avg")}:{" "}
            <span className="tabular-nums text-foreground">
              {formatMetricValue(metric.type, s.average, undefined, metric.unit)}
            </span>
          </span>
          {change != null && (
            <span className={`tabular-nums font-medium ${good ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {formatChange(change)}
            </span>
          )}
          {s.trend_better != null && (
            <span className={s.trend_better ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
              {s.trend_better ? "↗" : "↘"} {t("experiments.trend")}
            </span>
          )}
        </div>
        {metric.baseline_source !== "none" && metric.baseline_value != null && (
          <p className="text-xs text-muted-foreground">
            {t("experiments.baseline")}:{" "}
            <span className="tabular-nums">
              {formatMetricValue(metric.type, metric.baseline_value, metric.baseline_denom, metric.unit)}
            </span>{" "}
            · {t(`experiments.baselineSrc.${metric.baseline_source}`)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("experiments.consistency", { pct: Math.round(s.consistency * 100) })} ·{" "}
          {t("experiments.valuesCount", { n: s.value_count })}
        </p>
      </CardContent>
    </Card>
  )
}

export default function VersionDetailPage() {
  const { experimentId, versionId } = useParams()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const version = useQuery({
    queryKey: ["experiments", experimentId, "versions", versionId],
    queryFn: () => api.experiments.version(experimentId!, versionId!),
    enabled: Boolean(experimentId && versionId),
  })
  const [reflection, setReflection] = useState("")

  const saveReflection = useMutation({
    mutationFn: () => api.experiments.reflection(experimentId!, versionId!, reflection),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] })
      toast.success(t("experiments.reflectionSaved"))
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  const deleteCheckin = useMutation({
    mutationFn: (day: string) => api.experiments.deleteCheckin(experimentId!, versionId!, day),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] })
      toast.success(t("experiments.checkinDeleted"))
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  if (version.isLoading || !version.data) {
    return (
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-32 w-full" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    )
  }

  const v = version.data
  const canCheckin = v.status === "running"
  const needsReflection = v.status === "ended" || (v.status === "completed" && !v.reflection)

  return (
    <div>
      <Link
        to={`/experiments/${experimentId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("common.back")}
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">
              {t("experiments.versionLabel", { n: v.version_number })}
            </h2>
            <StatusBadge label={statusLabel(t, v.status)} variant={statusVariant(v.status)} />
            {v.is_best && <StatusBadge label={t("experiments.best")} variant="completed" />}
          </div>
          {v.change && <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{v.change}</p>}
          {v.success_criteria && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("experiments.successCriteria")}: {v.success_criteria}
            </p>
          )}
          {(v.status === "running" || v.status === "ended") && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("experiments.dayOf", { n: v.day_index, total: v.duration_days })}
              {v.status === "running" && v.days_left > 0 && ` · ${t("experiments.daysLeft", { n: v.days_left })}`}
            </p>
          )}
        </div>
      </div>

      {v.verdict && (
        <Card className="mb-6 shadow-none">
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium">{t("experiments.verdict")}</p>
            </div>
            <p className="text-sm">
              {t(`experiments.outcome.${v.verdict.outcome}`, { metric: v.verdict.metric_name })}
              {v.verdict.change_pct != null && (
                <span className="ml-2 tabular-nums font-medium">
                  {formatChange(v.verdict.change_pct)}
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {v.metrics.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium">{t("experiments.metrics")}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {v.metrics.map((m) => (
              <MetricStatsCard key={m.id} metric={m} />
            ))}
          </div>
        </div>
      )}

      {canCheckin && (
        <div className="mb-6">
          <CheckinForm
            version={v}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["experiments", experimentId, "versions", versionId] })}
          />
        </div>
      )}

      {needsReflection && (
        <Card className="mb-6 shadow-none">
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="text-sm font-medium">{t("experiments.reflectionTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("experiments.reflectionHint")}</p>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder={t("experiments.reflectionPlaceholder")}
              rows={4}
            />
            <div>
              <Button
                size="sm"
                disabled={saveReflection.isPending || !reflection.trim()}
                onClick={() => saveReflection.mutate()}
              >
                {saveReflection.isPending ? t("common.saving") : t("experiments.completeVersion")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {v.reflection && (
        <Card className="mb-6 shadow-none">
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="text-sm font-medium">{t("experiments.reflectionDone")}</p>
            <p className="text-sm text-muted-foreground">{v.reflection}</p>
          </CardContent>
        </Card>
      )}

      {v.checkins.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium">{t("experiments.history")}</h3>
          <div className="flex flex-col gap-2">
            {[...v.checkins].reverse().map((c) => (
              <Card key={c.id} className="shadow-none">
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium tabular-nums">{formatShortDate(c.day + "T12:00:00")}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => deleteCheckin.mutate(c.day)}
                      aria-label={t("experiments.deleteCheckin")}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {v.metrics.map((m) => {
                      const val = c.values.find((x) => x.metric_id === m.id)
                      if (!val) return null
                      const rendered = formatMetricValue(
                        m.type,
                        val.num_value,
                        val.denom_value,
                        m.unit,
                      )
                      if (m.type === "note") return null
                      return (
                        <span key={m.id} className="text-muted-foreground">
                          {m.name}: <span className="tabular-nums text-foreground">{rendered}</span>
                        </span>
                      )
                    })}
                  </div>
                  {c.note && <p className="text-sm text-muted-foreground">{c.note}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
