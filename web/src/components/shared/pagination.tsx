import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()
  const pages = Math.max(1, Math.ceil(total / limit))
  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <p className="text-xs tabular-nums text-muted-foreground">
        {total > 0
          ? t("pagination.range", {
              from: (page - 1) * limit + 1,
              to: Math.min(page * limit, total),
              total,
            })
          : t("pagination.empty")}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label={t("pagination.prev")}
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
          aria-label={t("pagination.next")}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
