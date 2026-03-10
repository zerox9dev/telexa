import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { AppLayout } from './layouts/AppLayout/AppLayout'
import { Landing } from './pages/Landing/Landing'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { Calendar } from './pages/Calendar/Calendar'
import { Editor } from './pages/Editor/Editor'
import { Settings } from './pages/Settings/Settings'
import { useScheduler } from './hooks/useScheduler'
import { isSupabaseConfigured } from './lib/supabase'

function SchedulerRunner() {
  useScheduler()
  return null
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (isSupabaseConfigured && loading) return null
  if (isSupabaseConfigured && !user) return <Navigate to="/" replace />
  return children
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (isSupabaseConfigured && loading) return null
  if (isSupabaseConfigured && user) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <SchedulerRunner />
      <Routes>
        <Route path="/" element={
          <PublicRoute><Landing /></PublicRoute>
        } />
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
