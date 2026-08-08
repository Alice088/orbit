import { useState } from "react"
import { Target } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { api, ApiError, setToken } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const navigate = useNavigate()
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
      setError(err instanceof ApiError ? err.message : "Не удалось подключиться к серверу")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Target className="size-5" />
          </div>
          <CardTitle className="text-lg">Orbit</CardTitle>
          <CardDescription>Личная система управления жизнью</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                required
                autoComplete="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как тебя зовут"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Подождите…" : "Войти"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Первый вход — аккаунт создастся автоматически
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
