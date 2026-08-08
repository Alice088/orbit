import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Flame, ListChecks, Sparkles, Target, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"
import { api } from "@/lib/api"
import { formatNumber, formatShortDate, greeting, weekRangeLabel } from "@/lib/format"
import { MetricCard } from "@/components/shared/metric-card"
import { ProgressBar } from "@/components/shared/progress-bar"
import { ActivityItem } from "@/components/shared/activity-item"
import { WeekNav } from "@/components/shared/week-nav"
import { EmptyState } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis } from "recharts"
import { goalStatusLabel } from "@/lib/labels"

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
  }))

  const doneToday =
    (today.data?.tasks_completed ?? 0) + (today.data?.habits_completed ?? 0)

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
          <CardTitle className="text-sm font-semibold">XP за последние 7 дней</CardTitle>
          <WeekNav
            weeksBack={weeksBack}
            label={weekRangeLabel(week.data?.days, weeksBack)}
            onChange={setWeeksBack}
          />
        </CardHeader>
        <CardContent>
          {week.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : chartData.every((d) => d.xp === 0) ? (
            <div className="flex h-48 flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="size-5" />
              <p>Пока нет данных за неделю</p>
            </div>
          ) : (
            <ChartContainer
              config={{ xp: { label: "XP", color: "hsl(var(--foreground))" } }}
              className="h-48 w-full"
            >
              <LineChart data={chartData} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
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
                <Line
                  type="monotone"
                  dataKey="xp"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: "hsl(var(--foreground))" }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
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
          <CardContent className="flex flex-col gap-4">
            {goals.isLoading ? (
              <Skeleton className="h-24 w-full" />
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
              (goals.data ?? []).slice(0, 4).map((g) => {
                const prog = goalsWithProgress.data?.find((p) => p.goal_id === g.id)
                return (
                  <Link key={g.id} to={`/goals/${g.id}`} className="group block">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium group-hover:underline">
                        {g.title}
                      </p>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {prog ? `${prog.percent}%` : "0%"}
                      </span>
                    </div>
                    <ProgressBar value={prog?.percent ?? 0} className="mt-2" />
                    <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{goalStatusLabel[g.status] ?? g.status}</span>
                      <span className="tabular-nums">
                        {formatNumber(prog?.earned_gpp ?? 0)} / {formatNumber(g.total_gpp)} GPP
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </CardContent>
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
