import { useEffect, useState } from 'react'
import { CheckCircle2, FileText, XCircle } from 'lucide-react'
import { api, unwrap } from '../api/client'
import { Stats as StatsData } from '../types'
import AppShell from '@/components/AppShell'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface Props {
  onLogout: () => void
}

const ITEMS = [
  { key: 'total_parsed', label: 'Parsed', icon: FileText, accent: 'text-foreground' },
  { key: 'total_sent', label: 'Published', icon: CheckCircle2, accent: 'text-emerald-500' },
  { key: 'total_discarded', label: 'Discarded', icon: XCircle, accent: 'text-muted-foreground' },
] as const

export default function Stats({ onLogout }: Props) {
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    api.get('/admin/stats').then(res => setStats(unwrap<StatsData>(res))).catch(() => {})
  }, [])

  const header = <span className="font-mono text-sm font-medium">Stats</span>

  return (
    <AppShell onLogout={onLogout} header={header}>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {ITEMS.map(({ key, label, icon: Icon, accent }) => {
              const value = stats?.[key]
              return (
                <Card key={key}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <span className="label">{label}</span>
                    <Icon className={`size-4 ${accent}`} />
                  </CardHeader>
                  <CardContent>
                    <span className="font-mono text-4xl font-semibold tabular-nums">
                      {value ?? '—'}
                    </span>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
