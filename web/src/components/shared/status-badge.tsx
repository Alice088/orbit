import { cn } from "@/lib/utils"

const variants = {
  active: "bg-secondary text-secondary-foreground",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  paused: "bg-muted text-muted-foreground",
  neutral: "bg-muted text-muted-foreground",
} as const

export function StatusBadge({
  label,
  variant = "neutral",
  className,
}: {
  label: string
  variant?: keyof typeof variants
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {label}
    </span>
  )
}
