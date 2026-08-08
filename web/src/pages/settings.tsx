import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Award, LogOut, Moon, Sun } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import { api, setToken } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { achievementTitle } from "@/lib/labels"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const queryClient = useQueryClient()
  const achievements = useQuery({
    queryKey: ["achievements"],
    queryFn: api.stats.achievements,
  })

  const checkin = useMutation({
    mutationFn: () => api.stats.checkin(""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] })
    },
  })

  const dark = resolvedTheme === "dark"

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="Настройки" description="Оформление и аккаунт." />
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Оформление</CardTitle>
          <CardDescription>Тёмная тема использует светлый текст на тёмном фоне.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between rounded-md border px-4 py-3">
          <div className="flex items-center gap-2.5">
            {dark ? <Moon className="size-4 text-muted-foreground" /> : <Sun className="size-4 text-muted-foreground" />}
            <span className="text-sm font-medium">{dark ? "Тёмная тема" : "Светлая тема"}</span>
          </div>
          <Switch checked={dark} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Аккаунт</CardTitle>
          <CardDescription>Личная система одного пользователя.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-md border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Ежедневный чекин</p>
              <p className="text-xs text-muted-foreground">Фиксирует активность, чтобы не сработал штраф за простой</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => checkin.mutate()}>
              Отметить
            </Button>
          </div>
          <Button variant="outline" onClick={() => {
            setToken(null)
            window.dispatchEvent(new Event("orbit:unauthorized"))
            navigate("/login", { replace: true })
          }}>
            <LogOut className="size-4" />
            Выйти
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Достижения</CardTitle>
          <CardDescription>Открываются за серии привычек.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {achievements.isLoading ? null : !achievements.data || achievements.data.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Пока нет — держи серию привычки до вехи
            </p>
          ) : (
            achievements.data.map((a) => (
              <div key={a.code} className="flex items-center gap-2.5 rounded-md border px-3 py-2.5">
                <div className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Award className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{achievementTitle(a.code)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(a.unlocked_at)}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
