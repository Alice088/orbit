import { useState } from "react"
import { NavLink, Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Coins,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  Menu,
  Moon,
  Repeat,
  Settings,
  Sun,
  Target,
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { api } from "@/lib/api"
import { implGroups, moduleToc, theoryToc } from "@/lib/docs-data"
import { useSearchParams } from "react-router-dom"
import { isEn, setLanguage } from "@/lib/i18n"
import { useEffect } from "react"

const navGroups = [
  {
    label: "nav.overview",
    items: [
      { to: "/", label: "nav.dashboard", icon: LayoutDashboard },
      { to: "/goals", label: "nav.goals", icon: Target },
      { to: "/tasks", label: "nav.tasks", icon: ListChecks },
      { to: "/habits", label: "nav.habits", icon: Repeat },
      { to: "/experiments", label: "nav.experiments", icon: FlaskConical },
    ],
  },
  {
    label: "nav.analysis",
    items: [
      { to: "/activity", label: "nav.activity", icon: Activity },
      { to: "/points", label: "nav.points", icon: Coins },
      { to: "/analytics", label: "nav.analytics", icon: BarChart3 },
    ],
  },
  {
    label: "nav.system",
    items: [
      { to: "/settings", label: "nav.settings", icon: Settings },
      { to: "/docs", label: "nav.docs", icon: BookOpen },
    ],
  },
]

const pageTitleKeys: Record<string, string> = {
  "/": "nav.dashboard",
  "/goals": "nav.goals",
  "/tasks": "nav.tasks",
  "/habits": "nav.habits",
  "/experiments": "nav.experiments",
  "/activity": "nav.activity",
  "/points": "nav.points",
  "/analytics": "nav.analytics",
  "/settings": "nav.settings",
  "/docs": "nav.docs",
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {t(group.label)}
          </p>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )
              }
            >
              <item.icon className="size-4" />
              {t(item.label)}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

function DocsNav({ onNavigate }: { onNavigate?: () => void }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const tab: "theory" | "impl" | "module" =
    searchParams.get("t") === "impl" ? "impl" : searchParams.get("t") === "module" ? "module" : "theory"
  const hash = decodeURIComponent(location.hash.slice(1))

  const goSection = (id: string) => {
    onNavigate?.()
    navigate(`/docs?t=${tab}#${id}`, { replace: true })
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const switchTab = (t: "theory" | "impl" | "module") => {
    onNavigate?.()
    navigate(t === "impl" ? "/docs?t=impl" : t === "module" ? "/docs?t=module" : "/docs", { replace: false })
    window.scrollTo({ top: 0 })
  }

  const goBack = () => {
    onNavigate?.()
    navigate("/")
  }

  const toc = theoryToc[isEn() ? "en" : "ru"]
  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("docs.back")}
      </button>
      <div className="flex flex-col gap-1">
        <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {t("docs.documentation")}
        </p>
        <div className="mt-1 flex flex-col gap-1 px-1">
          <button
            type="button"
            onClick={() => switchTab("theory")}
            className={cn(
              "rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors",
              tab === "theory"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            {t("docs.theory")}
          </button>
          <button
            type="button"
            onClick={() => switchTab("impl")}
            className={cn(
              "rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors",
              tab === "impl"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            {t("docs.implementation")}
          </button>
          <button
            type="button"
            onClick={() => switchTab("module")}
            className={cn(
              "rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors",
              tab === "module"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            {t("docs.module")}
          </button>
        </div>
      </div>

      {tab === "theory" ? (
        <div className="flex flex-col gap-1">
          <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {t("docs.sections")}
          </p>
          {toc.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goSection(item.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors",
                hash === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60",
              )}
            >
              {item.title}
            </button>
          ))}
        </div>
      ) : tab === "module" ? (
        <div className="flex flex-col gap-1">
          <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {t("docs.sections")}
          </p>
          {moduleToc[isEn() ? "en" : "ru"].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goSection(item.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors",
                hash === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60",
              )}
            >
              {item.title}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {implGroups.map((group) => (
            <div key={group.id} className="flex flex-col gap-1">
              <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {t(`docs.groups.${group.id}`)}
              </p>
              {group.blockIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => goSection(id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors",
                    hash === id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                  )}
                >
                  {t(`docs.blocks.${id}.title`)}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </nav>
  )
}

function SidebarPanels({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const isDocs = location.pathname.startsWith("/docs")
  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 overflow-y-auto transition-all duration-300 motion-reduce:transition-none",
          isDocs ? "-translate-x-4 opacity-0" : "translate-x-0 opacity-100",
        )}
      >
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <div
        className={cn(
          "absolute inset-0 overflow-y-auto transition-all duration-300 motion-reduce:transition-none",
          isDocs ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0 pointer-events-none",
        )}
      >
        <DocsNav onNavigate={onNavigate} />
      </div>
    </div>
  )
}

function Logo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link to="/" onClick={onNavigate} className="flex items-center gap-2 px-5 py-4">
      <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Target className="size-4" />
      </div>
      <span className="text-[15px] font-semibold tracking-tight">Orbit</span>
    </Link>
  )
}

function LanguageToggle() {
  const { t } = useTranslation()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs font-semibold"
      aria-label={t("langToggle." + (isEn() ? "toRu" : "toEn"))}
      onClick={() => setLanguage(isEn() ? "ru" : "en")}
    >
      {isEn() ? "RU" : "EN"}
    </Button>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useTranslation()
  const dark = resolvedTheme === "dark"
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? t("settings.lightTheme") : t("settings.darkTheme")}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}

function UserMenu() {
  const { t } = useTranslation()
  const me = useQuery({ queryKey: ["me"], queryFn: api.me })
  const name = me.data?.name ?? ""
  const initial = name ? name[0].toUpperCase() : "O"
  return (
    <div
      className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
      title={name || t("common.profile")}
    >
      {initial}
    </div>
  )
}

export function AppShell() {
  const location = useLocation()
  const { t, i18n: i18next } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langTick, setLangTick] = useState(0)

  useEffect(() => {
    const handler = () => setLangTick((n) => n + 1)
    i18next.on("languageChanged", handler)
    return () => i18next.off("languageChanged", handler)
  }, [i18next])
  void langTick

  const titleKey = pageTitleKeys[location.pathname] ?? ""
  const title = titleKey ? t(titleKey) : "Orbit"

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <div className="flex min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
          <Logo />
          <SidebarPanels />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col md:pl-60">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm md:px-6">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Меню">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
            <div className="ml-auto flex items-center gap-1.5">
              <LanguageToggle />
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
            <Outlet />
          </main>
        </div>

        <SheetContent side="left" className="w-64 p-0">
          <Logo onNavigate={() => setMobileOpen(false)} />
          <SidebarPanels onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </div>
    </Sheet>
  )
}
