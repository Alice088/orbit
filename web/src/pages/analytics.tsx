import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BarChart3, Flame, Scale, Target } from "lucide-react"
import { useTranslation } from "react-i18next"
import { api } from "@/lib/api"
import { formatNumber, formatShortDate, weekRangeLabel } from "@/lib/format"
import { PageHeader } from "@/components/shared/page-header"
import { WeekNav } from "@/components/shared/week-nav"
import { MetricCard } from "@/components/shared/metric-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, LabelList, XAxis } from "recharts"

export default function AnalyticsPage() {
  const { t } = useTranslation()
  const [weeksBack, setWeeksBack] = useState(0)
  const analytics = useQuery({
    queryKey: ["analytics", weeksBack],
    queryFn: () => api.stats.analytics(weeksBack),
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
        title={t("analytics.title")}
        description={t("analytics.subtitle")}
        actions={
          <WeekNav
            weeksBack={weeksBack}
            label={weekRangeLabel(a.week.days, weeksBack)}
            onChange={setWeeksBack}
          />
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={BarChart3}
          label={t("analytics.weekXp")}
          value={formatNumber(a.week.total_xp)}
          hint={t("analytics.avgHint", { n: formatNumber(a.week.avg_daily_xp) })}
        />
        <MetricCard
          icon={Target}
          label={t("analytics.suggestion")}
          value={formatNumber(a.week.suggested_weekly_goal)}
          hint={t("analytics.suggestionHint")}
        />
        <MetricCard
          icon={Scale}
          label={t("analytics.routine")}
          value={`${routinePct}%`}
          hint={t("analytics.routineHint", { habits: formatNumber(habitXPWeek), tasks: formatNumber(taskXPWeek) })}
        />
        <MetricCard
          icon={Flame}
          label={t("analytics.taskXp")}
          value={formatNumber(a.task_xp_last_week)}
          hint={t("analytics.taskXpHint")}
        />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t("analytics.weekChart")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ xp: { label: "XP", color: "hsl(var(--foreground))" } }}
            className="h-52 w-full"
          >
            <BarChart accessibilityLayer data={weekData} margin={{ top: 24 }}>
              <XAxis
                dataKey="day"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="xp" fill="var(--color-xp)" radius={8} maxBarSize={32}>
                <LabelList
                  position="top"
                  offset={12}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t("analytics.categoryChart")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {a.habit_by_category == null || a.habit_by_category.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("analytics.noData")}
              </p>
            ) : (
              a.habit_by_category.map((c) => (
                <div key={c.category || "uncategorized"}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{c.category || t("analytics.noCategory")}</span>
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
            <CardTitle className="text-sm font-semibold">{t("analytics.balance")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {weekData.every((d) => d.xp === 0) ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("analytics.weekNotStarted")}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("analytics.habitsRoutine")}</span>
                  <span className="tabular-nums font-medium">{formatNumber(habitXPWeek)} XP</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("analytics.tasksStrategy")}</span>
                  <span className="tabular-nums font-medium">{formatNumber(taskXPWeek)} XP</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("analytics.penalties")}</span>
                  <span className="tabular-nums font-medium text-red-700 dark:text-red-400">
                    {formatNumber(penaltyXPWeek)} XP
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{t("analytics.total")}</span>
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
