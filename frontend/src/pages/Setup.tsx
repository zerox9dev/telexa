import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api, unwrap } from '../api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  onConfigured: () => void
}

export default function Setup({ onConfigured }: Props) {
  const [apiId, setApiId] = useState('')
  const [apiHash, setApiHash] = useState('')
  const [botToken, setBotToken] = useState('')
  const [allowedUserId, setAllowedUserId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/setup/init', {
        telegram_api_id: Number(apiId),
        telegram_api_hash: apiHash,
        telegram_bot_token: botToken,
        allowed_user_id: Number(allowedUserId),
      })
      unwrap<{ ok: boolean }>(res)
      onConfigured()
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <span className="label">telexa</span>
          <CardTitle className="text-2xl">First-time setup</CardTitle>
          <CardDescription>
            Configure your Telegram credentials. These are stored in the local database
            and can be edited later from the Admin page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-id">Telegram API ID</Label>
              <Input
                id="api-id"
                type="number"
                value={apiId}
                onChange={e => setApiId(e.target.value)}
                placeholder="20602169"
                required
                className="font-mono"
              />
              <p className="font-mono text-[11px] text-muted-foreground">
                From <a className="underline" href="https://my.telegram.org" target="_blank" rel="noreferrer">my.telegram.org</a>.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-hash">Telegram API hash</Label>
              <Input
                id="api-hash"
                value={apiHash}
                onChange={e => setApiHash(e.target.value)}
                required
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bot-token">Bot token</Label>
              <Input
                id="bot-token"
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
                placeholder="1234:ABCdef…"
                required
                className="font-mono"
              />
              <p className="font-mono text-[11px] text-muted-foreground">
                From <a className="underline" href="https://t.me/BotFather" target="_blank" rel="noreferrer">@BotFather</a>. The bot must be admin in all target channels.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allowed">Your Telegram user ID</Label>
              <Input
                id="allowed"
                type="number"
                value={allowedUserId}
                onChange={e => setAllowedUserId(e.target.value)}
                placeholder="6505753971"
                required
                className="font-mono"
              />
              <p className="font-mono text-[11px] text-muted-foreground">
                Only this user will be allowed to log in. Get yours from <a className="underline" href="https://t.me/userinfobot" target="_blank" rel="noreferrer">@userinfobot</a>.
              </p>
            </div>

            {error && <p className="font-mono text-xs text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Save & continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
