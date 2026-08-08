import { useState } from "react"
import { Target } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { api, ApiError, setToken } from "@/lib/api"
import { setLanguage } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await api.session(name)
      setToken(res.access_token)
      window.dispatchEvent(new Event("orbit:authed"))
      navigate("/", { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.serverError"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4 flex gap-1 rounded-lg bg-muted p-1">
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
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Target className="size-5" />
          </div>
          <CardTitle className="text-lg">Orbit</CardTitle>
          <CardDescription>{t("login.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t("login.name")}</Label>
              <Input
                id="name"
                required
                autoComplete="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("login.namePlaceholder")}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? t("login.wait") : t("login.enter")}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {t("login.hint")}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
