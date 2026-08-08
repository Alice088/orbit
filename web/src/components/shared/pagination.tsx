import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Pagination({
  page,
  total,
  limit,
  onChange,
}: {
  page: number
  total: number
  limit: number
  onChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / limit))
  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <p className="text-xs tabular-nums text-muted-foreground">
        {total > 0 ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} из ${total}` : "пусто"}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Предыдущая страница"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">
          {page} / {pages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          aria-label="Следующая страница"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
