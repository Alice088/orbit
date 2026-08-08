import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MinusCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { api, ApiError } from "@/lib/api"
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

export function PenaltyDialog() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [currency, setCurrency] = useState("xp")
  const [goalId, setGoalId] = useState("")
  const [error, setError] = useState("")

  const goals = useQuery({ queryKey: ["goals"], queryFn: api.goals.list })

  const mutation = useMutation({
    mutationFn: () =>
      api.penalties.add({
        amount: Number(amount),
        reason,
        currency,
        ...(currency === "gpp" ? { goal_id: goalId } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["level"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["activity"] })
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      setOpen(false)
      setAmount("")
      setReason("")
      setCurrency("xp")
      setGoalId("")
      toast.success(t("penalty.recorded"))
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : t("penalty.errRecord"))
    },
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const n = Number(amount)
    if (!Number.isFinite(n) || n < 1 || n > 10000) {
      setError(t("penalty.errAmount"))
      return
    }
    if (!reason.trim()) {
      setError(t("penalty.errReason"))
      return
    }
    if (currency === "gpp" && !goalId) {
      setError(t("penalty.errGoal"))
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MinusCircle className="size-4" />
          {t("penalty.add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("penalty.title")}</DialogTitle>
          <DialogDescription>
            {t("penalty.desc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="penalty-amount">{t("penalty.amount")}</Label>
              <Input
                id="penalty-amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("penalty.deductFrom")}</Label>
              <Select value={currency} onValueChange={(v) => { setCurrency(v); setGoalId("") }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xp">{t("penalty.xpCurrency")}</SelectItem>
                  <SelectItem value="gpp">{t("penalty.gppCurrency")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="penalty-reason">{t("penalty.reason")}</Label>
            <Input
              id="penalty-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("penalty.reasonPlaceholder")}
            />
          </div>
          {currency === "gpp" && (
            <div className="flex flex-col gap-2">
              <Label>{t("penalty.goal")}</Label>
              <Select value={goalId || undefined} onValueChange={setGoalId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("penalty.chooseGoal")} />
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
          )}
          {Number.isFinite(Number(amount)) && Number(amount) > 0 && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm tabular-nums">
              {t("penalty.willDeduct", { n: amount, currency: currency === "gpp" ? "GPP" : "XP" })}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending ? t("penalty.recording") : t("penalty.deduct", { currency: currency === "gpp" ? "GPP" : "XP" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
