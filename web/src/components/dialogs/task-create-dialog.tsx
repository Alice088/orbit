import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { api, ApiError } from "@/lib/api"
import { difficultyOptions } from "@/lib/labels"
import { taskXp } from "@/lib/format"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function TaskCreateDialog({
  presetGoalId,
  onCreated,
}: {
  presetGoalId?: string
  onCreated?: () => void
}) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [goalId, setGoalId] = useState(presetGoalId ?? "")
  const [title, setTitle] = useState("")
  const [gpp, setGpp] = useState("")
  const [difficulty, setDifficulty] = useState("normal")
  const [error, setError] = useState("")

  const goals = useQuery({ queryKey: ["goals"], queryFn: api.goals.list })

  useEffect(() => {
    if (!open) return
    if (presetGoalId) {
      setGoalId(presetGoalId)
    } else if (!goalId && goals.data?.length === 1) {
      setGoalId(goals.data[0].id)
    }
  }, [open, presetGoalId, goalId, goals.data])

  const gppNum = Number(gpp)
  const preview =
    Number.isFinite(gppNum) && gppNum > 0
      ? { gpp: gppNum, xp: taskXp(gppNum, difficulty) }
      : undefined

  const mutation = useMutation({
    mutationFn: () =>
      api.tasks.create({
        goal_id: goalId,
        title,
        gpp_reward: gppNum,
        difficulty,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      setOpen(false)
      setTitle("")
      setGpp("")
      toast.success(t("taskCreate.created"))
      onCreated?.()
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : t("taskCreate.errCreate"))
    },
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!title.trim() || !goalId || !Number.isFinite(gppNum) || gppNum < 1 || gppNum > 5) {
      setError(t("taskCreate.errFields"))
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          {t("taskCreate.create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("taskCreate.create")}</DialogTitle>
          <DialogDescription>
            {t("taskCreate.desc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-title">{t("common.title")}</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("taskCreate.titlePlaceholder")}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("taskCreate.goal")}</Label>
            <Select value={goalId || undefined} onValueChange={setGoalId}>
              <SelectTrigger>
                <SelectValue placeholder={t("taskCreate.chooseGoal")} />
              </SelectTrigger>
              <SelectContent>
                {(goals.data ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-gpp">{t("taskCreate.price")}</Label>
              <Input
                id="task-gpp"
                type="number"
                min={1}
                max={5}
                value={gpp}
                onChange={(e) => setGpp(e.target.value)}
                placeholder={t("taskCreate.pricePlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("taskCreate.fromTo")}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("taskCreate.difficulty")}</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficultyOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label} {opt.multiplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {preview && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm tabular-nums">
              {t("taskCreate.reward", { gpp: preview.gpp, xp: preview.xp })}
            </div>
          )}
          <div className="rounded-md bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-muted-foreground">{t("taskCreate.pricing")}</p>
            <ul className="flex flex-col gap-0.5">
              <li>{t("taskCreate.pricing1")}</li>
              <li>{t("taskCreate.pricing2")}</li>
              <li>{t("taskCreate.pricing3")}</li>
              <li>{t("taskCreate.pricing4")}</li>
            </ul>
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
