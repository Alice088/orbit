import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Award, LogOut, Moon, Sun } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"
import { api, setToken } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { achievementTitle } from "@/lib/labels"
import { setLanguage } from "@/lib/i18n"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const { t, i18n } = useTranslation()
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
      <PageHeader title={t("settings.title")} description={t("settings.subtitle")} />
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t("settings.appearance")}</CardTitle>
          <CardDescription>{t("settings.appearanceDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between rounded-md border px-4 py-3">
          <div className="flex items-center gap-2.5">
            {dark ? <Moon className="size-4 text-muted-foreground" /> : <Sun className="size-4 text-muted-foreground" />}
            <span className="text-sm font-medium">{dark ? t("settings.darkTheme") : t("settings.lightTheme")}</span>
          </div>
          <Switch checked={dark} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t("settings.language")}</CardTitle>
          <CardDescription>{t("settings.languageDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between rounded-md border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{i18n.language === "ru" ? "Русский" : "English"}</span>
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setLanguage("ru")}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                i18n.language === "ru" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                i18n.language === "en" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              EN
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t("settings.account")}</CardTitle>
          <CardDescription>{t("settings.accountDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-md border px-4 py-3">
            <div>
              <p className="text-sm font-medium">{t("settings.checkin")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.checkinDesc")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => checkin.mutate()}>
              {t("settings.checkinBtn")}
            </Button>
          </div>
          <Button variant="outline" onClick={() => {
            setToken(null)
            window.dispatchEvent(new Event("orbit:unauthorized"))
            navigate("/login", { replace: true })
          }}>
            <LogOut className="size-4" />
            {t("common.signOut")}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t("settings.achievements")}</CardTitle>
          <CardDescription>{t("settings.achievementsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {achievements.isLoading ? null : !achievements.data || achievements.data.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("settings.noAchievements")}
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
