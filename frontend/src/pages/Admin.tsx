import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, LogIn, Play, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { api, unwrap } from '../api/client'
import { PublishLog } from '../types'
import AppShell from '@/components/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface OpenRouterModel {
  id: string
  name: string
  context_length: number | null
  pricing: { prompt?: string; completion?: string } | null
}

interface AISettings {
  openrouter_api_key: string
  openrouter_model: string
  default_model: string
  bot_parse_mode: 'none' | 'html' | 'markdown'
  telegram_api_id: string
  telegram_api_hash: string
  telegram_bot_token: string
  allowed_user_id: string
}

interface AutopilotSettings {
  enabled: boolean
  interval_minutes: number
  rewrite: boolean
  publish: boolean
}

interface SessionInfo {
  phone: string
  user_id: number
  created_at: string | null
  connected: boolean
}

interface Props {
  onLogout: () => void
}

export default function Admin({ onLogout }: Props) {
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [reconnecting, setReconnecting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const [logs, setLogs] = useState<PublishLog[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [targetFilter, setTargetFilter] = useState('')
  const [loading, setLoading] = useState(false)

  const [aiKey, setAiKey] = useState('')
  const [aiModel, setAiModel] = useState('')
  const [aiDefault, setAiDefault] = useState('')
  const [parseMode, setParseMode] = useState<'none' | 'html' | 'markdown'>('none')
  const [aiSaving, setAiSaving] = useState(false)
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)

  const [tgApiId, setTgApiId] = useState('')
  const [tgApiHash, setTgApiHash] = useState('')
  const [tgBotToken, setTgBotToken] = useState('')
  const [tgAllowedUserId, setTgAllowedUserId] = useState('')
  const [tgSaving, setTgSaving] = useState(false)

  const [autopilot, setAutopilot] = useState<AutopilotSettings>({
    enabled: false,
    interval_minutes: 30,
    rewrite: true,
    publish: true,
  })
  const [autopilotSaving, setAutopilotSaving] = useState(false)
  const [autopilotRunning, setAutopilotRunning] = useState(false)

  async function loadSession() {
    setSessionLoading(true)
    try {
      const res = await api.get('/auth/session')
      setSession(unwrap<SessionInfo | null>(res))
    } catch {
      setSession(null)
    } finally {
      setSessionLoading(false)
    }
  }

  async function reconnect() {
    setReconnecting(true)
    try {
      await api.post('/auth/reconnect')
      toast.success('Client reconnected')
      await loadSession()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Reconnect failed')
    } finally {
      setReconnecting(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await api.post('/auth/logout')
      onLogout()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Logout failed')
    } finally {
      setLoggingOut(false)
    }
  }

  async function saveAutopilot(patch: Partial<AutopilotSettings>) {
    const next = { ...autopilot, ...patch }
    setAutopilot(next)
    setAutopilotSaving(true)
    try {
      await api.put('/autopilot', next)
      toast.success(next.enabled ? 'Autopilot enabled' : 'Autopilot disabled')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setAutopilotSaving(false)
    }
  }

  async function runNow() {
    setAutopilotRunning(true)
    try {
      await api.post('/autopilot/run')
      toast.success('Cycle started')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setAutopilotRunning(false)
    }
  }

  useEffect(() => {
    api.get('/autopilot').then(res => {
      setAutopilot(unwrap<AutopilotSettings>(res))
    }).catch(() => {})
    loadSession()
    api.get('/admin/settings').then(res => {
      const s = unwrap<AISettings>(res)
      setAiKey(s.openrouter_api_key)
      setAiModel(s.openrouter_model)
      setAiDefault(s.default_model)
      setParseMode(s.bot_parse_mode)
      setTgApiId(s.telegram_api_id)
      setTgApiHash(s.telegram_api_hash)
      setTgBotToken(s.telegram_bot_token)
      setTgAllowedUserId(s.allowed_user_id)
    }).catch(() => {})
    setModelsLoading(true)
    api.get('/admin/openrouter-models')
      .then(res => setModels(unwrap<OpenRouterModel[]>(res)))
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load models')
      })
      .finally(() => setModelsLoading(false))
    loadLogs()
  }, [])

  async function loadLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from_', from)
      if (to) params.set('to', to)
      if (sourceFilter) params.set('source_channel', sourceFilter)
      if (targetFilter) params.set('target_channel', targetFilter)
      const res = await api.get(`/admin/logs?${params}`)
      setLogs(unwrap<PublishLog[]>(res))
    } finally {
      setLoading(false)
    }
  }

  async function saveTelegram() {
    setTgSaving(true)
    try {
      await api.put('/admin/settings', {
        telegram_api_id: Number(tgApiId),
        telegram_api_hash: tgApiHash,
        telegram_bot_token: tgBotToken,
        allowed_user_id: Number(tgAllowedUserId),
      })
      toast.success('Telegram settings saved — restart backend to refresh the session')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setTgSaving(false)
    }
  }

  async function saveAiSettings() {
    setAiSaving(true)
    try {
      await api.put('/admin/settings', {
        openrouter_api_key: aiKey,
        openrouter_model: aiModel,
        bot_parse_mode: parseMode,
      })
      toast.success('Settings saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setAiSaving(false)
    }
  }

  const header = (
    <div className="flex flex-1 items-center justify-between">
      <span className="font-mono text-sm font-medium">Admin</span>
    </div>
  )

  return (
    <AppShell onLogout={onLogout} header={header}>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-6 p-6">
          {/* Autopilot */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Autopilot</CardTitle>
                  <CardDescription className="mt-1">
                    Automatically fetch, rewrite, and publish new posts on a schedule.
                  </CardDescription>
                </div>
                <Switch
                  checked={autopilot.enabled}
                  onCheckedChange={v => saveAutopilot({ enabled: v })}
                  disabled={autopilotSaving}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ap-interval">Interval (minutes)</Label>
                  <Input
                    id="ap-interval"
                    type="number"
                    min={1}
                    max={1440}
                    value={autopilot.interval_minutes}
                    onChange={e => setAutopilot(p => ({ ...p, interval_minutes: Number(e.target.value) }))}
                    onBlur={() => saveAutopilot({})}
                    className="font-mono"
                  />
                </div>
                <div className="flex flex-col justify-end space-y-3">
                  <div className="flex items-center justify-between rounded-sm border px-3 py-2">
                    <Label htmlFor="ap-rewrite" className="cursor-pointer">AI rewrite</Label>
                    <Switch
                      id="ap-rewrite"
                      checked={autopilot.rewrite}
                      onCheckedChange={v => saveAutopilot({ rewrite: v })}
                      disabled={autopilotSaving}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-sm border px-3 py-2">
                    <Label htmlFor="ap-publish" className="cursor-pointer">Auto publish</Label>
                    <Switch
                      id="ap-publish"
                      checked={autopilot.publish}
                      onCheckedChange={v => saveAutopilot({ publish: v })}
                      disabled={autopilotSaving}
                    />
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                  <Button variant="outline" onClick={runNow} disabled={autopilotRunning}>
                    {autopilotRunning
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Play className="size-4" />}
                    Run now
                  </Button>
                </div>
              </div>
              <p className="font-mono text-[11px] text-muted-foreground">
                Rewrite off → posts published as-is. Publish off → posts fetched &amp; rewritten but not sent.
              </p>
            </CardContent>
          </Card>

          {/* Userbot session */}
          <Card>
            <CardHeader>
              <CardTitle>Userbot session</CardTitle>
              <CardDescription>
                Active MTProto session used to parse source channels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading…
                </div>
              ) : !session ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">No active session</span>
                  <Button size="sm" onClick={onLogout}>
                    <LogIn className="size-4" /> Sign in
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Phone</p>
                      <p className="font-mono text-sm">{session.phone}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">User ID</p>
                      <p className="font-mono text-sm">{session.user_id}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Logged in</p>
                      <p className="font-mono text-sm">
                        {session.created_at
                          ? new Date(session.created_at).toLocaleString()
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      variant={session.connected ? 'default' : 'secondary'}
                      className={session.connected
                        ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-muted text-muted-foreground'}
                    >
                      {session.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={reconnect} disabled={reconnecting}>
                      {reconnecting
                        ? <Loader2 className="size-4 animate-spin" />
                        : <RefreshCw className="size-4" />}
                      Reconnect
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleLogout}
                      disabled={loggingOut}
                    >
                      {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4 rotate-180" />}
                      Log out userbot
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Telegram */}
          <Card>
            <CardHeader>
              <CardTitle>Telegram credentials</CardTitle>
              <CardDescription>
                Editing these affects future logins and publishing. After saving you may need
                to restart the backend or re-authenticate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tg-api-id">API ID</Label>
                  <Input
                    id="tg-api-id"
                    type="number"
                    value={tgApiId}
                    onChange={e => setTgApiId(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tg-api-hash">API hash</Label>
                  <Input
                    id="tg-api-hash"
                    type="password"
                    value={tgApiHash}
                    onChange={e => setTgApiHash(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tg-bot">Bot token</Label>
                  <Input
                    id="tg-bot"
                    type="password"
                    value={tgBotToken}
                    onChange={e => setTgBotToken(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tg-uid">Allowed user ID</Label>
                  <Input
                    id="tg-uid"
                    type="number"
                    value={tgAllowedUserId}
                    onChange={e => setTgAllowedUserId(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <Button onClick={saveTelegram} disabled={tgSaving}>
                {tgSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save Telegram settings
              </Button>
            </CardContent>
          </Card>

          {/* AI provider */}
          <Card>
            <CardHeader>
              <CardTitle>AI provider (OpenRouter)</CardTitle>
              <CardDescription>
                Leave API key empty to fall back to local LM Studio at localhost:1234.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={aiKey}
                    onChange={e => setAiKey(e.target.value)}
                    placeholder="sk-or-v1-…"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Popover open={modelOpen} onOpenChange={setModelOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="model"
                        variant="outline"
                        role="combobox"
                        aria-expanded={modelOpen}
                        className="w-full justify-between font-mono font-normal"
                      >
                        <span className="truncate">
                          {modelsLoading
                            ? 'Loading models…'
                            : aiModel || aiDefault || 'Select a model'}
                        </span>
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[320px] p-0" align="start">
                      <Command
                        filter={(value, search) => {
                          if (!search) return 1
                          return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                        }}
                      >
                        <CommandInput placeholder="Search models…" />
                        <CommandList>
                          <CommandEmpty>
                            {modelsLoading ? 'Loading…' : 'No model found.'}
                          </CommandEmpty>
                          <CommandGroup>
                            {models.map(m => (
                              <CommandItem
                                key={m.id}
                                value={`${m.id} ${m.name}`}
                                onSelect={() => {
                                  setAiModel(m.id)
                                  setModelOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 size-4',
                                    aiModel === m.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                <div className="flex min-w-0 flex-col">
                                  <span className="truncate font-mono text-xs">{m.id}</span>
                                  <span className="truncate text-[11px] text-muted-foreground">
                                    {m.name}
                                    {m.context_length ? ` · ${(m.context_length / 1000).toFixed(0)}K ctx` : ''}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="parse-mode">Bot parse mode</Label>
                  <Select value={parseMode} onValueChange={v => setParseMode(v as 'none' | 'html' | 'markdown')}>
                    <SelectTrigger id="parse-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (plain text)</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="markdown">MarkdownV2</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    How Telegram renders posts. Use <b>None</b> if posts may contain stray * _ [ `.
                  </p>
                </div>
              </div>
              <Button onClick={saveAiSettings} disabled={aiSaving}>
                {aiSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save settings
              </Button>
            </CardContent>
          </Card>

          {/* Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Publish logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
                <div className="space-y-1.5">
                  <Label htmlFor="from">From</Label>
                  <Input id="from" type="date" value={from} onChange={e => setFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to">To</Label>
                  <Input id="to" type="date" value={to} onChange={e => setTo(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="src">Source</Label>
                  <Input id="src" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} placeholder="username" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tgt">Target</Label>
                  <Input id="tgt" value={targetFilter} onChange={e => setTargetFilter(e.target.value)} placeholder="username" />
                </div>
                <div className="flex items-end">
                  <Button onClick={loadLogs} disabled={loading} className="w-full">
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    Apply
                  </Button>
                </div>
              </div>

              <div className="overflow-auto rounded-sm border">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      {['Date', 'Source', 'Target', 'Original', 'Rewritten', 'Media'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-mono font-normal">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">No logs found</td>
                      </tr>
                    ) : logs.map(log => (
                      <tr key={log.id} className="align-top">
                        <td className="whitespace-nowrap px-3 py-2 text-xs">
                          {new Date(log.published_at).toLocaleDateString()}{' '}
                          <span className="text-muted-foreground">
                            {new Date(log.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">@{log.source_channel_username}</td>
                        <td className="px-3 py-2 font-mono text-xs">@{log.target_channel_username}</td>
                        <td className="max-w-[240px] px-3 py-2 text-xs text-muted-foreground">
                          <span className="line-clamp-2" title={log.original_text_snippet}>
                            {log.original_text_snippet || '—'}
                          </span>
                        </td>
                        <td className="max-w-[240px] px-3 py-2 text-xs text-muted-foreground">
                          <span className="line-clamp-2" title={log.rewritten_text_snippet ?? ''}>
                            {log.rewritten_text_snippet || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-xs">{log.media_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
