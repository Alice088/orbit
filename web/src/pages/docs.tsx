import { useEffect } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { BookOpen, Boxes, FlaskConical } from "lucide-react"
import { cn } from "@/lib/utils"
import { implGroups } from "@/lib/docs-data"
import report from "../../../docs/deep-research-report.md?raw"

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border bg-muted/60 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-foreground/90">
      {children}
    </pre>
  )
}

type MdProps = { children?: React.ReactNode }

const markdownComponents: Components = {
  h1: ({ children }: MdProps) => (
    <h2
      id={slugify(String(children))}
      className="scroll-mt-20 pt-8 text-lg font-semibold tracking-tight first:pt-0"
    >
      {children}
    </h2>
  ),
  p: ({ children }: MdProps) => (
    <p className="mt-3 text-sm leading-7 text-muted-foreground">{children}</p>
  ),
  strong: ({ children }: MdProps) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  ul: ({ children }: MdProps) => (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }: MdProps) => (
    <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }: MdProps) => <li>{children}</li>,
  code: ({ children }: MdProps) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">
      {children}
    </code>
  ),
  pre: ({ children }: MdProps) => (
    <pre className="mt-4 overflow-x-auto rounded-lg border bg-muted/60 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-foreground/90">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-6 border-border" />,
  blockquote: ({ children }: MdProps) => (
    <blockquote className="mt-3 border-l-2 border-border pl-4 text-sm leading-6 text-muted-foreground">
      {children}
    </blockquote>
  ),
}

function TabSwitcher({
  tab,
  onChange,
}: {
  tab: "theory" | "impl"
  onChange: (t: "theory" | "impl") => void
}) {
  const { t } = useTranslation()
  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-1 text-sm font-medium">
      <button
        type="button"
        onClick={() => onChange("theory")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
          tab === "theory"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <FlaskConical className="size-3.5" />
        {t("docs.theory")}
      </button>
      <button
        type="button"
        onClick={() => onChange("impl")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
          tab === "impl"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Boxes className="size-3.5" />
        {t("docs.implementation")}
      </button>
    </div>
  )
}

export default function DocsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const { t } = useTranslation()
  const tab: "theory" | "impl" = searchParams.get("t") === "impl" ? "impl" : "theory"

  useEffect(() => {
    if (!location.hash) return
    const id = decodeURIComponent(location.hash.slice(1))
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [location.hash, tab])

  const switchTab = (t: "theory" | "impl") => {
    setSearchParams(t === "impl" ? { t: "impl" } : {}, { replace: true })
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {tab === "theory" ? t("docs.theorySubtitle") : t("docs.implSubtitle")}
          </p>
        </div>
        <TabSwitcher tab={tab} onChange={switchTab} />
      </div>

      {tab === "theory" ? (
        <div className="mt-2 border-t border-border pt-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {report}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {implGroups.map((group) => (
            <section key={group.id}>
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <BookOpen className="size-4" />
                {t(`docs.groups.${group.id}`)}
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-4">
                {group.blockIds.map((blockId) => (
                  <div
                    key={blockId}
                    id={blockId}
                    className="scroll-mt-20 rounded-xl border bg-card p-5 shadow-none"
                  >
                    <h3 className="text-sm font-semibold">{t(`docs.blocks.${blockId}.title`)}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t(`docs.blocks.${blockId}.desc`)}</p>
                    <CodeBlock>{t(`docs.blocks.${blockId}.code`)}</CodeBlock>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
