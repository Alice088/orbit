import {
  Award,
  Ban,
  CalendarCheck,
  CheckCircle2,
  CircleSlash,
  Clock4,
  ListChecks,
  MinusCircle,
  Repeat,
  Target,
  Trash2,
  UserCheck,
  type LucideIcon,
} from "lucide-react"
import type { ActivityEvent } from "@/lib/api"
import { eventDescription, eventLabel } from "@/lib/labels"
import { timeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"

const eventIcons: Record<string, LucideIcon> = {
  task_completed: CheckCircle2,
  task_regressed: MinusCircle,
  task_deleted: Trash2,
  habit_completed: Repeat,
  habit_deleted: Trash2,
  goal_created: Target,
  goal_reviewed: CalendarCheck,
  goal_deleted: Trash2,
  manual_checkin: UserCheck,
  manual_penalty: Ban,
  daily_settlement: Clock4,
  inactivity_penalty: CircleSlash,
  achievement_unlocked: Award,
  streak_advanced: ListChecks,
}

export function ActivityItem({
  event,
  last = false,
}: {
  event: ActivityEvent
  last?: boolean
}) {
  const Icon = eventIcons[event.event_type] ?? ListChecks
  const description = eventDescription(event)
  return (
    <div className="relative flex gap-3 pb-5">
      <div className="flex flex-col items-center">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
          <Icon className="size-3.5" />
        </div>
        {!last && <div className="mt-1 w-px flex-1 bg-border" />}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-medium">{eventLabel[event.event_type] ?? event.event_type}</p>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        <p className={cn("mt-0.5 text-xs text-muted-foreground/70")}>{timeAgo(event.occurred_at)}</p>
      </div>
    </div>
  )
}
