import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function WeekNav({
  weeksBack,
  label,
  onChange,
}: {
  weeksBack: number
  label: string
  onChange: (weeksBack: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(weeksBack + 1)}
        aria-label="Предыдущая неделя"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-28 text-center text-xs tabular-nums text-muted-foreground">
        {label}
      </span>
      <Button
        variant="ghost"
        size="icon"
        disabled={weeksBack <= 0}
        onClick={() => onChange(weeksBack - 1)}
        aria-label="Следующая неделя"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
