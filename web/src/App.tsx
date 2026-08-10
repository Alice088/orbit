import { useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { api, getStoredName, getToken, setToken } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import LoginPage from "@/pages/login"
import DashboardPage from "@/pages/dashboard"
import GoalsPage from "@/pages/goals"
import GoalDetailPage from "@/pages/goal-detail"
import TasksPage from "@/pages/tasks"
import HabitsPage from "@/pages/habits"
import ActivityPage from "@/pages/activity"
import PointsPage from "@/pages/points"
import AnalyticsPage from "@/pages/analytics"
import ExperimentsPage from "@/pages/experiments"
import ExperimentDetailPage from "@/pages/experiment-detail"
import VersionDetailPage from "@/pages/version-detail"
import DocsPage from "@/pages/docs"
import SettingsPage from "@/pages/settings"

type AuthState = "loading" | "authed" | "anon"

function useAuthed(): AuthState {
  const [state, setState] = useState<AuthState>("loading")
  useEffect(() => {
    const onUnauthorized = () => setState("anon")
    const onAuthed = () => setState("authed")
    window.addEventListener("orbit:unauthorized", onUnauthorized)
    window.addEventListener("orbit:authed", onAuthed)
    return () => {
      window.removeEventListener("orbit:unauthorized", onUnauthorized)
      window.removeEventListener("orbit:authed", onAuthed)
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    const finish = (next: AuthState) => {
      if (!cancelled) setState(next)
    }
    if (getToken()) {
      api
        .me()
        .then(() => finish("authed"))
        .catch(() => {
          setToken(null)
          finish("anon")
        })
      return () => {
        cancelled = true
      }
    }
    const name = getStoredName()
    if (!name) {
      finish("anon")
      return
    }
    api
      .session(name)
      .then((res) => {
        if (cancelled) return
        setToken(res.access_token)
        window.dispatchEvent(new Event("orbit:authed"))
      })
      .catch(() => finish("anon"))
    return () => {
      cancelled = true
    }
  }, [])
  return state
}

export default function App() {
  const authed = useAuthed()
  if (authed === "loading") {
    return <div className="min-h-screen bg-background" />
  }
  const isAuthed = authed === "authed"
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthed ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route
          path="/"
          element={isAuthed ? <AppShell /> : <Navigate to="/login" replace />}
        >
          <Route index element={<DashboardPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="goals/:goalId" element={<GoalDetailPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="points" element={<PointsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="experiments" element={<ExperimentsPage />} />
          <Route path="experiments/:experimentId" element={<ExperimentDetailPage />} />
          <Route path="experiments/:experimentId/versions/:versionId" element={<VersionDetailPage />} />
          <Route path="docs" element={<DocsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
