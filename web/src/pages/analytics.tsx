import { useQuery } from "@tanstack/react-query"
import { BarChart3, Flame, Scale, Target } from "lucide-react"
import { api } from "@/lib/api"
import { formatNumber, formatShortDate } from "@/lib/format"
import { PageHeader } from "@/components/shared/page-header"
import { MetricCard } from "@/components/shared/metric-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis } from "recharts"

export default function AnalyticsPage() {
  const analytics = useQuery({
    queryKey: ["analytics"],
    queryFn: api.stats.analytics,
  })

  if (analytics.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  const a = analytics.data
  if (!a) return null

  const weekData = (a.week.days ?? []).map((d) => ({
    day: formatShortDate(d.day),
    xp: d.xp_earned,
  }))

  const maxCategory = Math.max(1, ...(a.habit_by_category ?? []).map((c) => c.xp))
  const habitXPWeek = (a.week.days ?? []).reduce((s, d) => s + d.habit_xp, 0)
  const taskXPWeek = (a.week.days ?? []).reduce((s, d) => s + d.task_xp, 0)
  const penaltyXPWeek = (a.week.days ?? []).reduce((s, d) => s + d.penalty_xp, 0)
  const totalWeekly = habitXPWeek + taskXPWeek
  const routinePct = totalWeekly > 0 ? Math.round((habitXPWeek / totalWeekly) * 100) : 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Аналитика"
        description="Недельные показатели: сколько XP ты наработал и на что они ушли."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={BarChart3}
          label="XP за неделю"
          value={formatNumber(a.week.total_xp)}
          hint={`среднее: ${formatNumber(a.week.avg_daily_xp)} XP/день`}
        />
        <MetricCard
          icon={Target}
          label="Предложение на неделю"
          value={formatNumber(a.week.suggested_weekly_goal)}
          hint="цель ×1.1 от среднего, не применяется автоматически"
        />
        <MetricCard
          icon={Scale}
          label="Рутина / стратегия"
          value={`${routinePct}%`}
          hint={`привычки: ${formatNumber(habitXPWeek)} XP · задачи: ${formatNumber(taskXPWeek)} XP`}
        />
        <MetricCard
          icon={Flame}
          label="XP из задач за неделю"
          value={formatNumber(a.task_xp_last_week)}
          hint="стратегический вклад"
        />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">XP по дням недели</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ xp: { label: "XP", color: "hsl(var(--foreground))" } }}
            className="h-52 w-full"
          >
            <BarChart data={weekData} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                dy={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="xp" fill="hsl(var(--foreground))" radius={[2, 2, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">XP привычек по категориям</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {a.habit_by_category == null || a.habit_by_category.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Пока нет данных за неделю
              </p>
            ) : (
              a.habit_by_category.map((c) => (
                <div key={c.category || "без категории"}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{c.category || "без категории"}</span>
                    <span className="tabular-nums text-muted-foreground">{formatNumber(c.xp)} XP</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{ width: `${Math.max(4, (c.xp / maxCategory) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Баланс недели</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {weekData.every((d) => d.xp === 0) ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Неделя ещё не началась — выполни первое действие
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Привычки (рутина)</span>
                  <span className="tabular-nums font-medium">{formatNumber(habitXPWeek)} XP</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Задачи (стратегия)</span>
                  <span className="tabular-nums font-medium">{formatNumber(taskXPWeek)} XP</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Штрафы</span>
                  <span className="tabular-nums font-medium text-red-700 dark:text-red-400">
                    {formatNumber(penaltyXPWeek)} XP
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Итого</span>
                  <span className="tabular-nums">{formatNumber(a.week.total_xp)} XP</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
