import { useQuery } from "@tanstack/react-query"
import { Coins, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react"
import { api, type Transaction } from "@/lib/api"
import { formatNumber, formatDateTime } from "@/lib/format"
import { reasonLabel, currencyLabel } from "@/lib/labels"
import { PageHeader } from "@/components/shared/page-header"
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
    <span className="inline-flex w-10 items-center justify-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
      {currencyLabel(currency)}
    </span>
  )
}

export default function PointsPage() {
  const level = useQuery({ queryKey: ["level"], queryFn: api.stats.level })
  const week = useQuery({ queryKey: ["stats", "week"], queryFn: api.stats.week })
  const today = useQuery({ queryKey: ["stats", "today"], queryFn: api.stats.today })
  const txs = useQuery({ queryKey: ["transactions"], queryFn: api.stats.transactions })

  const lastWeekXP = week.data?.total_xp ?? 0
  const trend =
    lastWeekXP > 0
      ? { up: true, text: `+${formatNumber(lastWeekXP)} XP за неделю` }
      : lastWeekXP < 0
        ? { up: false, text: `${formatNumber(lastWeekXP)} XP за неделю` }
        : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Баллы"
        description="XP — глобальный уровень, GPP — прогресс целей. Это бухгалтерия, а не игра."
        actions={<PenaltyDialog />}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Sparkles}
          label="Всего XP"
          value={level.isLoading ? "—" : formatNumber(level.data?.xp ?? 0)}
          hint={level.data ? `уровень: ${level.data.level_name}` : undefined}
        />
        <MetricCard
          icon={TrendingUp}
          label="XP за неделю"
          value={week.isLoading ? "—" : formatNumber(lastWeekXP)}
          hint={trend ? trend.text : "нет данных"}
        />
        <MetricCard
          icon={Coins}
          label="GPP за сегодня"
          value={today.isLoading ? "—" : formatNumber(today.data?.gpp_earned ?? 0)}
          hint="прогресс целей"
        />
        <MetricCard
          icon={Target}
          label="До следующего уровня"
          value={
            level.isLoading || !level.data?.next_xp
              ? "—"
              : formatNumber(Math.max(0, level.data.next_xp - level.data.xp))
          }
          hint={level.data?.next_xp ? `порог: ${formatNumber(level.data.next_xp)} XP` : "максимум"}
        />
      </div>

      <Card className="shadow-none">
        <CardContent className="p-0">
          {txs.isLoading ? (
            <div className="p-4">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !txs.data || txs.data.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Транзакций пока нет
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Цель</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead className="w-14 text-right">Валюта</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs.data.map((t: Transaction) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(t.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">{reasonLabel[t.reason] ?? t.reason}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {t.goal_title || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Amount amount={t.amount} />
                    </TableCell>
                    <TableCell className="text-right">
                      <CurrencyPill currency={t.currency} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {txs.data && txs.data.length > 0 && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {trend?.up ? (
            <TrendingUp className="size-3.5" />
          ) : (
            <TrendingDown className="size-3.5" />
          )}
          Показаны последние {txs.data.length} транзакций
        </p>
      )}
    </div>
  )
}
