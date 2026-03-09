import { useEffect, useRef, useCallback, useState } from 'react'
import { processDuePosts } from '../lib/postingEngine'

const INTERVAL_MS = 30_000 // check every 30s

export function useScheduler() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [lastCheck, setLastCheck] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState({ sent: 0, failed: 0 })

  const tick = useCallback(async () => {
    if (running) return // prevent overlapping
    setRunning(true)
    try {
      const result = await processDuePosts()
      setLastCheck(new Date().toISOString())
      if (result.sent > 0 || result.failed > 0) {
        setStats(prev => ({
          sent: prev.sent + result.sent,
          failed: prev.failed + result.failed,
        }))
      }
    } catch {
      // silent — individual errors handled in engine
    } finally {
      setRunning(false)
    }
  }, [running])

  useEffect(() => {
    // Run immediately on mount
    tick()
    intervalRef.current = setInterval(tick, INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { lastCheck, running, stats }
}
