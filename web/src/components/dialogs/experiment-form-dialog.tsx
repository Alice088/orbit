import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FlaskConical, Plus, Star, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { api, ApiError, type Experiment, type ExperimentVersion, type MetricInput, type MetricType } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

const metricTypes: MetricType[] = ["count", "duration", "rate", "score", "binary", "note"]

interface MetricRow {
  name: string
  type: MetricType
  unit: string
  direction: string
  is_primary: boolean
  baseline_source: "none" | "manual" | "measured"
  baseline_value: string
  baseline_denom: string
}

function emptyMetric(source: MetricRow["baseline_source"] = "measured"): MetricRow {
  return {
    name: "",
    type: "count",
    unit: "",
    direction: "",
    is_primary: false,
    baseline_source: source,
    baseline_value: "",
    baseline_denom: "",
  }
}

function fromMetric(m: ExperimentVersion["metrics"][number], suggested?: number): MetricRow {
  const row: MetricRow = {
    name: m.name,
    type: m.type,
    unit: m.unit ?? "",
    direction: m.direction ?? "",
    is_primary: m.is_primary,
    baseline_source: (m.baseline_source as MetricRow["baseline_source"]) ?? "none",
    baseline_value: m.baseline_value != null ? String(m.baseline_value) : "",
    baseline_denom: m.baseline_denom != null ? String(m.baseline_denom) : "",
  }
  if (row.baseline_source === "none" && suggested != null) {
    row.baseline_source = "measured"
    if (row.type === "rate") {
      row.baseline_value = String(Math.round(suggested * 100))
      row.baseline_denom = "100"
    } else {
      row.baseline_value = String(Math.round(suggested * 100) / 100)
    }
  }
  return row
}

export function ExperimentFormDialog({
  open,
  onOpenChange,
  experiment,
  version,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  experiment?: Experiment
  version?: ExperimentVersion
  onSaved: (expId: string, versionId: string, started: boolean) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const editing = Boolean(version)
  const [title, setTitle] = useState(experiment?.title ?? "")
  const [category, setCategory] = useState(experiment?.category ?? "")
  const [tags, setTags] = useState((experiment?.tags ?? []).join(", "))
  const [change, setChange] = useState(version?.change ?? "")
  const [criteria, setCriteria] = useState(version?.success_criteria ?? "")
  const [duration, setDuration] = useState(version?.duration_days != null ? String(version.duration_days) : "7")
  const [rows, setRows] = useState<MetricRow[]>(() =>
    version && version.metrics.length > 0
      ? version.metrics.map((m, i) => fromMetric(m, version.metrics[i].suggested_baseline))
      : [emptyMetric(editing ? "measured" : "none")],
  )
  const [error, setError] = useState("")

  const mutation = useMutation({
    mutationFn: async () => {
      const metrics: MetricInput[] = rows.map((r) => ({
        name: r.name,
        type: r.type,
        unit: r.unit.trim(),
        direction: r.direction,
        is_primary: r.is_primary,
        baseline_source: r.baseline_source,
        baseline_value: r.baseline_value === "" ? undefined : Number(r.baseline_value),
        baseline_denom: r.baseline_denom === "" ? undefined : Number(r.baseline_denom),
      }))
      const body = {
        title: title.trim(),
        category: category.trim(),
        tags: tags
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        change: change.trim(),
        success_criteria: criteria.trim(),
        duration_days: editing ? Number(duration) : 0,
        metrics,
      }
      let expId: string
      let versionId: string
      if (editing && version) {
        expId = version.experiment_id
        versionId = version.id
        await api.experiments.updateVersion(expId, versionId, {
          change: body.change,
          success_criteria: body.success_criteria,
          duration_days: body.duration_days,
          metrics,
        })
      } else {
        const created = await api.experiments.create(body)
        expId = created.id
        versionId = created.versions[0].id
      }
      return { expId, versionId, started: false }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] })
      toast.success(editing ? t("experiments.saved") : t("experiments.created"))
      onOpenChange(false)
      onSaved(res.expId, res.versionId, res.started)
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : t("experiments.errSave"))
    },
  })

  function validate(): boolean {
    if (!editing && !title.trim()) {
      setError(t("experiments.errTitle"))
      return false
    }
    if (!rows.some((r) => r.name.trim())) {
      setError(t("experiments.errMetric"))
      return false
    }
    const filled = rows.filter((r) => r.name.trim())
    const primaries = filled.filter((r) => r.is_primary)
    if (primaries.length !== 1) {
      setError(t("experiments.errPrimary"))
      return false
    }
    if (!primaries[0].direction) {
      setError(t("experiments.errDirection"))
      return false
    }
    const dur = Number(duration)
    if (!Number.isFinite(dur) || dur < 1 || dur > 365) {
      setError(t("experiments.errDuration"))
      return false
    }
    for (const r of filled) {
      if (r.type === "note") continue
      if (r.baseline_source !== "none" && (r.baseline_value === "" || !Number.isFinite(Number(r.baseline_value)))) {
        setError(t("experiments.errBaseline"))
        return false
      }
      if (r.baseline_source !== "none" && r.type === "rate" && r.baseline_denom === "") {
        setError(t("experiments.errBaseline"))
        return false
      }
    }
    return true
  }

  function submit() {
    setError("")
    if (!validate()) return
    mutation.mutate()
  }

  function setRow(index: number, patch: Partial<MetricRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function togglePrimary(index: number) {
    setRows((prev) =>
      prev.map((r, i) => ({
        ...r,
        is_primary: i === index ? !r.is_primary : false,
      })),
    )
  }

  function useSuggestion(index: number, suggested: number) {
    const row = rows[index]
    if (row.type === "rate") {
      setRow(index, { baseline_source: "measured", baseline_value: String(suggested * 100), baseline_denom: "100" })
    } else {
      setRow(index, { baseline_source: "measured", baseline_value: String(suggested) })
    }
  }

  const isBusy = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("experiments.editVersion") : t("experiments.create")}
          </DialogTitle>
          <DialogDescription>{t("experiments.dialogDesc")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="flex flex-col gap-4"
        >
          {!editing && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="exp-title">{t("common.title")}</Label>
              <Input
                id="exp-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("experiments.titlePlaceholder")}
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="exp-category">{t("experiments.category")}</Label>
            <Input
              id="exp-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t("experiments.categoryPlaceholder")}
            />
          </div>
          {editing && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="exp-duration">{t("experiments.duration")}</Label>
              <Input
                id="exp-duration"
                type="number"
                min={1}
                max={365}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          )}
          {!editing && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="exp-tags">{t("experiments.tags")}</Label>
              <Input
                id="exp-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t("experiments.tagsPlaceholder")}
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="exp-change">{t("experiments.change")}</Label>
            <Textarea
              id="exp-change"
              value={change}
              onChange={(e) => setChange(e.target.value)}
              placeholder={t("experiments.changePlaceholder")}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="exp-criteria">{t("experiments.successCriteria")}</Label>
            <Textarea
              id="exp-criteria"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder={t("experiments.criteriaPlaceholder")}
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("experiments.metrics")}</Label>
            <p className="text-xs leading-relaxed text-muted-foreground">{t("experiments.metricsHint")}</p>
            <div className="flex flex-col gap-3">
              {rows.map((row, i) => {
                const suggested = version?.metrics[i]?.suggested_baseline
                return (
                  <div key={i} className="flex flex-col gap-2 rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={row.is_primary ? "default" : "outline"}
                        size="icon"
                        className={row.is_primary ? "bg-amber-500 text-white hover:bg-amber-500 hover:text-white" : ""}
                        onClick={() => togglePrimary(i)}
                        title={t("experiments.primary")}
                        aria-label={t("experiments.primary")}
                      >
                        <Star className="size-4" />
                      </Button>
                      <Input
                        value={row.name}
                        onChange={(e) => setRow(i, { name: e.target.value })}
                        placeholder={t("experiments.metricName")}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={rows.length === 1}
                        onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={t("experiments.removeMetric")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>{t("experiments.metricType")}</Label>
                        <Select
                          value={row.type}
                          onValueChange={(v) => setRow(i, { type: v as MetricType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {metricTypes.map((mt) => (
                              <SelectItem key={mt} value={mt}>
                                {t(`experiments.type.${mt}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {(row.type === "count" || row.type === "duration") && (
                        <div className="flex flex-col gap-1.5">
                          <Label>{t("experiments.unit")}</Label>
                          <Input
                            value={row.unit}
                            onChange={(e) => setRow(i, { unit: e.target.value })}
                            placeholder={row.type === "duration" ? t("experiments.unitDuration") : t("experiments.unitCount")}
                          />
                        </div>
                      )}
                      {row.type === "note" && <span />}
                    </div>
                    {row.type !== "note" && (
                      <div className="flex flex-col gap-1.5">
                        <Label>{t("experiments.direction")}</Label>
                        <Select
                          value={row.direction}
                          onValueChange={(v) => setRow(i, { direction: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("experiments.directionPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="higher_better">{t("experiments.dirHigher")}</SelectItem>
                            <SelectItem value="lower_better">{t("experiments.dirLower")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {row.type !== "note" && (
                      <div className="flex flex-col gap-1.5">
                        <Label>{t("experiments.baseline")}</Label>
                        <Select
                          value={row.baseline_source}
                          onValueChange={(v) => setRow(i, { baseline_source: v as MetricRow["baseline_source"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("experiments.baselineNone")}</SelectItem>
                            <SelectItem value="manual">{t("experiments.baselineManual")}</SelectItem>
                            <SelectItem value="measured">{t("experiments.baselineMeasured")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs leading-relaxed text-muted-foreground">{t("experiments.baselineHint")}</p>
                        {row.baseline_source !== "none" && (
                          <div className="flex items-end gap-2">
                            {row.type === "rate" ? (
                              <>
                                <Input
                                  type="number"
                                  min={0}
                                  value={row.baseline_value}
                                  onChange={(e) => setRow(i, { baseline_value: e.target.value })}
                                  placeholder={t("experiments.baselineValue")}
                                  className="w-20"
                                />
                                <span className="pb-2 text-sm text-muted-foreground">/</span>
                                <Input
                                  type="number"
                                  min={1}
                                  value={row.baseline_denom}
                                  onChange={(e) => setRow(i, { baseline_denom: e.target.value })}
                                  placeholder={t("experiments.denominator")}
                                  className="w-20"
                                />
                              </>
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                value={row.baseline_value}
                                onChange={(e) => setRow(i, { baseline_value: e.target.value })}
                                placeholder={t("experiments.baselineValue")}
                                className="w-24"
                              />
                            )}
                            {row.baseline_source === "measured" && suggested != null ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => useSuggestion(i, suggested)}
                              >
                                <FlaskConical className="size-3.5" />
                                {t("experiments.useHistory", { n: Math.round(suggested * 100) / 100 })}
                              </Button>
                            ) : row.baseline_source === "measured" ? (
                              <p className="pb-1.5 text-xs text-muted-foreground">{t("experiments.noHistoryHint")}</p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((prev) => [...prev, emptyMetric(editing ? "measured" : "none")])}
            >
              <Plus className="size-4" />
              {t("experiments.addMetric")}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isBusy}>
              {isBusy ? t("common.saving") : editing ? t("common.save") : t("experiments.saveDraft")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
