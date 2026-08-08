import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Activity as ActivityIcon } from "lucide-react"
import { api } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { PageHeader, EmptyState } from "@/components/shared/page-header"
import { ActivityItem } from "@/components/shared/activity-item"
import { Pagination } from "@/components/shared/pagination"
import { Skeleton } from "@/components/ui/skeleton"

export default function ActivityPage() {
  const [page, setPage] = useState(1)
  const limit = 20
  const activity = useQuery({
    queryKey: ["activity", page],
    queryFn: () => api.stats.activity(limit, (page - 1) * limit),
  })

  const grouped = new Map<string, NonNullable<typeof activity.data>["items"]>()
  for (const e of activity.data?.items ?? []) {
    const day = formatDate(e.occurred_at)
    const list = grouped.get(day) ?? []
    list.push(e)
    grouped.set(day, list)
  }

  return (
    <div>
      <PageHeader
        title="Активность"
        description="Журнал всех событий: задачи, привычки, ревью и расчёты."
      />
      {activity.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !activity.data || activity.data.items.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="Пока тихо"
          description="Здесь появится журнал действий, когда ты выполнишь первую задачу или привычку."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {[...grouped.entries()].map(([day, events]) => (
            <div key={day}>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {day}
              </p>
              <div className="flex flex-col">
                {events.map((e, i) => (
                  <ActivityItem key={e.id} event={e} last={i === events.length - 1} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {activity.data && activity.data.total > limit && (
        <div className="mt-6">
          <Pagination
            page={page}
            total={activity.data.total}
            limit={limit}
            onChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
