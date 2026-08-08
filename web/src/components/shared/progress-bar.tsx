import { cn } from "@/lib/utils"

export function ProgressBar({
  value,
  className,
  trackClassName,
}: {
  value: number
  className?: string
  trackClassName?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", trackClassName)}
    >
      <div
        className={cn("h-full rounded-full bg-foreground transition-all duration-300", className)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
