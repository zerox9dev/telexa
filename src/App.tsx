import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { AppLayout } from './layouts/AppLayout/AppLayout'
import { Landing } from './pages/Landing/Landing'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { Calendar } from './pages/Calendar/Calendar'
import { Editor } from './pages/Editor/Editor'
import { Settings } from './pages/Settings/Settings'
import { useScheduler } from './hooks/useScheduler'

function SchedulerRunner() {
  useScheduler()
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SchedulerRunner />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/editor/:id" element={<Editor />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
