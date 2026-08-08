import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Flame, ListChecks, Sparkles, Target, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"
import { api } from "@/lib/api"
import { formatNumber, formatShortDate, greeting, weekRangeLabel } from "@/lib/format"
import { MetricCard } from "@/components/shared/metric-card"
import { ActivityItem } from "@/components/shared/activity-item"
import { WeekNav } from "@/components/shared/week-nav"
import { EmptyState } from "@/components/shared/page-header"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Area, AreaChart, LabelList, RadialBar, RadialBarChart, XAxis, YAxis } from "recharts"

export default function DashboardPage() {
  const [weeksBack, setWeeksBack] = useState(0)
  const today = useQuery({ queryKey: ["stats", "today"], queryFn: api.stats.today })
  const week = useQuery({
    queryKey: ["stats", "week", weeksBack],
    queryFn: () => api.stats.week(weeksBack),
  })
  const level = useQuery({ queryKey: ["level"], queryFn: api.stats.level })
  const goals = useQuery({ queryKey: ["goals"], queryFn: api.goals.list })
  const activity = useQuery({
    queryKey: ["activity"],
    queryFn: () => api.stats.activity(5, 0),
    refetchInterval: 60_000,
  })

  const goalsWithProgress = useQuery({
    queryKey: ["goals", "progress"],
    queryFn: async () => {
      const list = await api.goals.list()
      return Promise.all(list.map((g) => api.goals.progress(g.id)))
    },
    enabled: goals.data ? goals.data.length > 0 : false,
  })

  const chartData = (week.data?.days ?? []).map((d) => ({
    day: formatShortDate(d.day),
    xp: d.xp_earned,
    gpp: d.gpp_earned,
  }))

  const doneToday =
    (today.data?.tasks_completed ?? 0) + (today.data?.habits_completed ?? 0)

  const visibleGoals = (goals.data ?? []).slice(0, 4)
  const goalChartData = visibleGoals.map((g, i) => {
    const prog = goalsWithProgress.data?.find((p) => p.goal_id === g.id)
    return {
      goal: g.title,
      percent: prog?.percent ?? 0,
      fill: `hsl(var(--chart-${i + 1}))`,
    }
  })
  const goalChartConfig = Object.fromEntries(
    goalChartData.map((d) => [d.goal, { label: d.goal }])
  ) satisfies ChartConfig
  const totalEarned = visibleGoals.reduce((s, g) => {
    const p = goalsWithProgress.data?.find((x) => x.goal_id === g.id)
    return s + (p?.earned_gpp ?? 0)
  }, 0)
  const totalGPP = visibleGoals.reduce((s, g) => s + g.total_gpp, 0)
  const avgPercent =
    totalGPP > 0 ? Math.round((totalEarned / totalGPP) * 100) : 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{greeting()}.</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Вот твой прогресс по текущим целям.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Flame}
          label="XP за сегодня"
          value={today.isLoading ? "—" : formatNumber(today.data?.xp_earned ?? 0)}
          hint={today.data && today.data.penalty_xp !== 0 ? `штрафы: ${today.data.penalty_xp}` : undefined}
        />
        <MetricCard
          icon={Sparkles}
          label="Уровень"
          value={level.isLoading ? "—" : `${level.data?.level_name ?? ""}`}
          hint={level.data ? `${formatNumber(level.data.xp)} XP` : undefined}
        />
        <MetricCard
          icon={Target}
          label="GPP за сегодня"
          value={today.isLoading ? "—" : formatNumber(today.data?.gpp_earned ?? 0)}
          hint="прогресс целей"
        />
        <MetricCard
          icon={ListChecks}
          label="Выполнено сегодня"
          value={today.isLoading ? "—" : formatNumber(doneToday)}
          hint={today.data ? `${today.data.tasks_completed} задач · ${today.data.habits_completed} привычек` : undefined}
        />
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">XP и GPP за неделю</CardTitle>
          <WeekNav
            weeksBack={weeksBack}
            label={weekRangeLabel(week.data?.days, weeksBack)}
            onChange={setWeeksBack}
          />
        </CardHeader>
        <CardContent>
          {week.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : chartData.every((d) => d.xp === 0 && d.gpp === 0) ? (
            <div className="flex h-48 flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="size-5" />
              <p>Пока нет данных за неделю</p>
            </div>
          ) : (
            <ChartContainer
              config={{
                xp: { label: "XP", color: "hsl(var(--foreground))" },
                gpp: { label: "GPP", color: "hsl(160 84% 39%)" },
              }}
              className="h-48 w-full"
            >
              <AreaChart data={chartData} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillXp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillGpp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
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
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="xp"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1.5}
                  fill="url(#fillXp)"
                  dot={{ r: 2.5, fill: "hsl(var(--foreground))" }}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="gpp"
                  stroke="hsl(160 84% 39%)"
                  strokeWidth={1.5}
                  fill="url(#fillGpp)"
                  dot={{ r: 2.5, fill: "hsl(160 84% 39%)" }}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Цели</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/goals">
                Все цели <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {goals.isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : !goals.data || goals.data.length === 0 ? (
              <EmptyState
                icon={Target}
                title="Целей пока нет"
                description="Создай первую цель, чтобы начать отслеживать прогресс."
                action={
                  <Button asChild size="sm">
                    <Link to="/goals">Создать цель</Link>
                  </Button>
                }
              />
            ) : (
              <ChartContainer
                config={goalChartConfig}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <RadialBarChart
                  data={goalChartData}
                  startAngle={-90}
                  endAngle={380}
                  innerRadius={30}
                  outerRadius={110}
                >
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel nameKey="goal" />}
                  />
                  <RadialBar dataKey="percent" background>
                    <LabelList
                      position="insideStart"
                      dataKey="goal"
                      className="fill-white mix-blend-luminosity"
                      fontSize={11}
                    />
                  </RadialBar>
                </RadialBarChart>
              </ChartContainer>
            )}
          </CardContent>
          {visibleGoals.length > 0 && (
            <CardFooter className="flex-col items-start gap-1 pt-4 text-sm">
              <div className="flex items-center gap-2 leading-none font-medium">
                <Target className="size-3.5" />
                Средний прогресс: {avgPercent}%
              </div>
              <div className="leading-none text-muted-foreground">
                {formatNumber(totalEarned)} / {formatNumber(totalGPP)} GPP по{" "}
                {visibleGoals.length}{" "}
                {visibleGoals.length === 1 ? "цели" : "целям"}
              </div>
            </CardFooter>
          )}
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Активность</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/activity">
                Вся активность <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activity.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !activity.data || activity.data.items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Пока нет активности
              </p>
            ) : (
              <div className="flex flex-col">
                {activity.data.items.slice(0, 5).map((e, i) => (
                  <ActivityItem
                    key={e.id}
                    event={e}
                    last={i === Math.min(5, activity.data.items.length) - 1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
