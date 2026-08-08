import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronRight, Coins, Sparkles, Target, TrendingUp } from "lucide-react"
import { useTranslation } from "react-i18next"
import { api, type Transaction } from "@/lib/api"
import { formatNumber, formatDateTime } from "@/lib/format"
import { reasonLabel, currencyLabel } from "@/lib/labels"
import { PageHeader } from "@/components/shared/page-header"
import { Pagination } from "@/components/shared/pagination"
import { MetricCard } from "@/components/shared/metric-card"
import { PenaltyDialog } from "@/components/dialogs/penalty-dialog"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function Amount({ amount }: { amount: number }) {
  const positive = amount > 0
  return (
    <span
      className={cn(
        "text-sm font-medium tabular-nums",
        positive
          ? "text-emerald-700 dark:text-emerald-400"
          : "text-red-700 dark:text-red-400",
      )}
    >
      {positive ? `+${formatNumber(amount)}` : `−${formatNumber(Math.abs(amount))}`}
    </span>
  )
}

function CurrencyPill({ currency }: { currency: string }) {
  return (
    <span className="inline-flex min-w-10 items-center justify-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
      {currencyLabel(currency)}
    </span>
  )
}

function txDescription(tx: Transaction): string {
  const base = reasonLabel(tx.reason)
  if (tx.reason === "habit_completed" || !tx.source_title) return base
  return `${base} · ${tx.source_title}`
}

function txGoal(tx: Transaction): string {
  if (tx.reason === "habit_completed") return tx.source_title || "—"
  return tx.goal_title || "—"
}

function TxRow({ tx }: { tx: Transaction }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {formatDateTime(tx.created_at)}
      </TableCell>
      <TableCell className="text-sm">{txDescription(tx)}</TableCell>
      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
        {txGoal(tx)}
      </TableCell>
      <TableCell className="text-right">
        <Amount amount={tx.amount} />
      </TableCell>
      <TableCell className="text-right">
        <CurrencyPill currency={tx.currency} />
      </TableCell>
    </TableRow>
  )
}

function TxGroupRow({ group }: { group: Transaction[] }) {
  const [open, setOpen] = useState(false)
  const first = group[0]
  const gppTxs = group.filter((t) => t.currency === "gpp")
  const xpTxs = group.filter((t) => t.currency === "xp")
  const primaryTxs = gppTxs.length > 0 ? gppTxs : xpTxs
  const currency = gppTxs.length > 0 ? "gpp" : "xp"
  const total = primaryTxs.reduce((s, t) => s + t.amount, 0)
  const expandable = gppTxs.length > 0 && xpTxs.length > 0

  if (!expandable) {
    return (
      <TableRow>
        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(first.created_at)}
        </TableCell>
        <TableCell className="text-sm">{txDescription(first)}</TableCell>
        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
          {txGoal(first)}
        </TableCell>
        <TableCell className="text-right">
          <Amount amount={total} />
        </TableCell>
        <TableCell className="text-right">
          <CurrencyPill currency={currency} />
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      <TableRow onClick={() => setOpen((v) => !v)} className="cursor-pointer">
        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            {formatDateTime(first.created_at)}
          </span>
        </TableCell>
        <TableCell className="text-sm font-medium">{txDescription(first)}</TableCell>
        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
          {txGoal(first)}
        </TableCell>
        <TableCell className="text-right">
          <Amount amount={total} />
        </TableCell>
        <TableCell className="text-right">
          <CurrencyPill currency={currency} />
        </TableCell>
      </TableRow>
      {open &&
        xpTxs.map((t) => (
          <TableRow key={t.id} className="bg-muted/40">
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell className="text-right">
              <Amount amount={t.amount} />
            </TableCell>
            <TableCell className="text-right">
              <CurrencyPill currency={t.currency} />
            </TableCell>
          </TableRow>
        ))}
    </>
  )
}

export default function PointsPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const limit = 20
  const level = useQuery({ queryKey: ["level"], queryFn: api.stats.level })
  const week = useQuery({ queryKey: ["stats", "week"], queryFn: () => api.stats.week() })
  const today = useQuery({ queryKey: ["stats", "today"], queryFn: api.stats.today })
  const txs = useQuery({
    queryKey: ["transactions", page],
    queryFn: () => api.stats.transactions(limit, (page - 1) * limit),
  })

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const tx of txs.data?.items ?? []) {
      const key = tx.domain_event_id ?? tx.id
      const arr = map.get(key)
      if (arr) arr.push(tx)
      else map.set(key, [tx])
    }
    return [...map.values()]
  }, [txs.data])

  const lastWeekXP = week.data?.total_xp ?? 0
  const trend =
    lastWeekXP > 0
      ? { up: true, text: t("points.weekEarned", { n: formatNumber(lastWeekXP) }) }
      : lastWeekXP < 0
        ? { up: false, text: t("points.weekLost", { n: formatNumber(lastWeekXP) }) }
        : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("points.title")}
        description={t("points.subtitle")}
        actions={<PenaltyDialog />}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Sparkles}
          label={t("points.totalXp")}
          value={level.isLoading ? "—" : formatNumber(level.data?.xp ?? 0)}
          hint={level.data ? t("points.levelHint", { name: level.data.level_name }) : undefined}
        />
        <MetricCard
          icon={TrendingUp}
          label={t("points.weekXp")}
          value={week.isLoading ? "—" : formatNumber(lastWeekXP)}
          hint={trend ? trend.text : t("points.noData")}
        />
        <MetricCard
          icon={Coins}
          label={t("points.gppToday")}
          value={today.isLoading ? "—" : formatNumber(today.data?.gpp_earned ?? 0)}
          hint={t("points.goalProgress")}
        />
        <MetricCard
          icon={Target}
          label={t("points.toNextLevel")}
          value={
            level.isLoading || !level.data?.next_xp
              ? "—"
              : formatNumber(Math.max(0, level.data.next_xp - level.data.xp))
          }
          hint={level.data?.next_xp ? t("points.thresholdHint", { n: formatNumber(level.data.next_xp) }) : t("points.max")}
        />
      </div>

      <Card className="shadow-none">
        <CardContent className="p-0">
          {txs.isLoading ? (
            <div className="p-4">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !txs.data || txs.data.items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t("points.noTransactions")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("points.date")}</TableHead>
                  <TableHead>{t("points.description")}</TableHead>
                  <TableHead>{t("points.goal")}</TableHead>
                  <TableHead className="text-right">{t("points.sum")}</TableHead>
                  <TableHead className="w-14 text-right">{t("points.currency")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) =>
                  g.length > 1 ? (
                    <TxGroupRow key={g[0].id} group={g} />
                  ) : (
                    <TxRow key={g[0].id} tx={g[0]} />
                  ),
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {txs.data && txs.data.total > 0 && (
        <Pagination page={page} total={txs.data.total} limit={limit} onChange={setPage} />
      )}
    </div>
  )
}
