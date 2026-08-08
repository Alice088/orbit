import { useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  Activity,
  BarChart3,
  Coins,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  Repeat,
  Search,
  Settings,
  Sun,
  Target,
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { api, setToken } from "@/lib/api"

const navGroups = [
  {
    label: "Обзор",
    items: [
      { to: "/", label: "Дашборд", icon: LayoutDashboard },
      { to: "/goals", label: "Цели", icon: Target },
      { to: "/tasks", label: "Задачи", icon: ListChecks },
      { to: "/habits", label: "Привычки", icon: Repeat },
    ],
  },
  {
    label: "Анализ",
    items: [
      { to: "/activity", label: "Активность", icon: Activity },
      { to: "/points", label: "Баллы", icon: Coins },
      { to: "/analytics", label: "Аналитика", icon: BarChart3 },
    ],
  },
  {
    label: "Система",
    items: [{ to: "/settings", label: "Настройки", icon: Settings }],
  },
]

const pageTitles: Record<string, string> = {
  "/": "Дашборд",
  "/goals": "Цели",
  "/tasks": "Задачи",
  "/habits": "Привычки",
  "/activity": "Активность",
  "/points": "Баллы",
  "/analytics": "Аналитика",
  "/settings": "Настройки",
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {group.label}
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
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2 px-5 py-4">
      <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Target className="size-4" />
      </div>
      <span className="text-[15px] font-semibold tracking-tight">Orbit</span>
    </div>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === "dark"
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Включить светлую тему" : "Включить тёмную тему"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}

function UserMenu() {
  const navigate = useNavigate()
  const me = useQuery({ queryKey: ["me"], queryFn: api.me })
  const name = me.data?.name ?? ""
  const initial = name ? name[0].toUpperCase() : "O"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Профиль">
          <Avatar className="size-8">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
              {initial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-medium">{name || "Профиль"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setToken(null)
            window.dispatchEvent(new Event("orbit:unauthorized"))
            navigate("/login")
          }}
        >
          <LogOut className="size-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppShell() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const title = pageTitles[location.pathname] ?? "Orbit"

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <div className="flex min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
          <Logo />
          <div className="flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
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
              <div className="relative hidden items-center sm:flex">
                <Search className="absolute left-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Поиск…"
                  className="h-8 w-44 rounded-md border bg-muted/50 pl-8 pr-8 text-sm"
                />
                <kbd className="absolute right-2 text-[10px] text-muted-foreground">⌘K</kbd>
              </div>
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
            <Outlet />
          </main>
        </div>

        <SheetContent side="left" className="w-64 p-0">
          <Logo />
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </div>
    </Sheet>
  )
}
