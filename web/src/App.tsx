import { useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { getToken } from "@/lib/api"
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
import DocsPage from "@/pages/docs"
import SettingsPage from "@/pages/settings"

function useAuthed(): boolean {
  const [authed, setAuthed] = useState(() => getToken() !== null)
  useEffect(() => {
    const onUnauthorized = () => setAuthed(false)
    const onAuthed = () => setAuthed(true)
    window.addEventListener("orbit:unauthorized", onUnauthorized)
    window.addEventListener("orbit:authed", onAuthed)
    return () => {
      window.removeEventListener("orbit:unauthorized", onUnauthorized)
      window.removeEventListener("orbit:authed", onAuthed)
    }
  }, [])
  return authed
}

export default function App() {
  const authed = useAuthed()
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={authed ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route
          path="/"
          element={authed ? <AppShell /> : <Navigate to="/login" replace />}
        >
          <Route index element={<DashboardPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="goals/:goalId" element={<GoalDetailPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="points" element={<PointsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="docs" element={<DocsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
