import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { api } from './api/client'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Stats from './pages/Stats'
import Setup from './pages/Setup'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ChannelsProvider } from '@/contexts/ChannelsContext'

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)

  async function refresh() {
    try {
      const setup = await api.get('/setup/status')
      const isConfigured = !!setup.data.data.configured
      setConfigured(isConfigured)
      if (!isConfigured) {
        setAuthed(false)
        return
      }
      const auth = await api.get('/auth/status')
      setAuthed(!!auth.data.data.authenticated)
    } catch {
      setConfigured(false)
      setAuthed(false)
    }
  }

  useEffect(() => { refresh() }, [])

  if (authed === null || configured === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <BrowserRouter>
        {!configured ? (
          <Routes>
            <Route path="/setup" element={<Setup onConfigured={() => { setConfigured(true) }} />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </Routes>
        ) : authed ? (
          <ChannelsProvider>
            <Routes>
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/setup" element={<Navigate to="/" replace />} />
              <Route path="/admin" element={<Admin onLogout={() => setAuthed(false)} />} />
              <Route path="/stats" element={<Stats onLogout={() => setAuthed(false)} />} />
              <Route path="/" element={<Dashboard onLogout={() => setAuthed(false)} />} />
            </Routes>
          </ChannelsProvider>
        ) : (
          <Routes>
            <Route path="/login" element={<Login onLogin={() => setAuthed(true)} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </BrowserRouter>
      <Toaster richColors position="bottom-right" />
    </TooltipProvider>
  )
}
