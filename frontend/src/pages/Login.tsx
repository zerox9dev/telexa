import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Loader2, QrCode, Smartphone } from 'lucide-react'
import { api, unwrap } from '../api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  onLogin: () => void
}

type LoginMode = 'choose' | 'qr' | 'phone'
type PhoneStep = 1 | 2 | 3

export default function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<LoginMode>('choose')

  const [qrUrl, setQrUrl] = useState('')
  const [qrToken, setQrToken] = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  const [qrNeedPassword, setQrNeedPassword] = useState(false)
  const [qrPassword, setQrPassword] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [phoneStep, setPhoneStep] = useState<PhoneStep>(1)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeHash, setCodeHash] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  async function startQr() {
    setMode('qr')
    setError('')
    setQrLoading(true)
    try {
      const res = await api.post('/auth/qr-init')
      const data = unwrap<{ url: string; token: string }>(res)
      setQrUrl(data.url)
      setQrToken(data.token)
      startPolling(data.token)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to init QR')
    } finally {
      setQrLoading(false)
    }
  }

  function startPolling(token: string) {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.post('/auth/qr-check', { token })
        const data = unwrap<{ waiting?: boolean; url?: string; need_password?: boolean; user_id?: number; token?: string }>(res)
        if (data.need_password) {
          stopPolling()
          setQrNeedPassword(true)
          if (data.token) setQrToken(data.token)
        } else if (data.waiting) {
          if (data.url) setQrUrl(data.url)
        } else if (data.user_id) {
          stopPolling()
          onLogin()
        }
      } catch { /* ignore */ }
    }, 3000)
  }

  async function handleQrPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/qr-password', { phone: qrToken, password: qrPassword })
      onLogin()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Wrong password')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/send-code', { phone })
      const data = unwrap<{ phone_code_hash: string }>(res)
      setCodeHash(data.phone_code_hash)
      setPhoneStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/verify-code', { phone, code, phone_code_hash: codeHash })
      const data = unwrap<{ need_password?: boolean; user_id?: number }>(res)
      if (data.need_password) setPhoneStep(3)
      else onLogin()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/verify-password', { phone, password })
      onLogin()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Wrong password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <span className="label">telexa</span>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Single-user access via Telegram</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'choose' && (
            <div className="space-y-2">
              <Button onClick={startQr} className="w-full">
                <QrCode className="size-4" />
                Sign in with QR code
              </Button>
              <Button variant="outline" onClick={() => setMode('phone')} className="w-full">
                <Smartphone className="size-4" />
                Sign in with phone
              </Button>
            </div>
          )}

          {mode === 'qr' && !qrNeedPassword && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Open Telegram → Settings → Devices → Link Desktop Device → scan this code.
              </p>
              <div className="flex min-h-[260px] items-center justify-center">
                {qrLoading ? (
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                ) : qrUrl ? (
                  <QRCodeSVG value={qrUrl} size={240} bgColor="#ffffff" fgColor="#000000" level="L" />
                ) : null}
              </div>
              {error && <p className="font-mono text-xs text-destructive">{error}</p>}
              <Button
                variant="outline"
                onClick={() => { stopPolling(); setMode('choose'); setError('') }}
                className="w-full"
              >
                Back
              </Button>
            </div>
          )}

          {mode === 'qr' && qrNeedPassword && (
            <form onSubmit={handleQrPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qr-pw">2FA cloud password</Label>
                <Input id="qr-pw" type="password" value={qrPassword} onChange={e => setQrPassword(e.target.value)} required autoFocus />
              </div>
              {error && <p className="font-mono text-xs text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="size-4 animate-spin" />}
                Confirm
              </Button>
            </form>
          )}

          {mode === 'phone' && phoneStep === 1 && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+79001234567" required />
              </div>
              {error && <p className="font-mono text-xs text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="size-4 animate-spin" />}
                Send code
              </Button>
              <Button type="button" variant="outline" onClick={() => { setMode('choose'); setError('') }} className="w-full">
                Back
              </Button>
            </form>
          )}

          {mode === 'phone' && phoneStep === 2 && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code from Telegram</Label>
                <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="12345" required autoFocus />
              </div>
              {error && <p className="font-mono text-xs text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="size-4 animate-spin" />}
                Verify
              </Button>
              <Button type="button" variant="outline" onClick={() => { setPhoneStep(1); setError('') }} className="w-full">
                Back
              </Button>
            </form>
          )}

          {mode === 'phone' && phoneStep === 3 && (
            <form onSubmit={handlePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw">2FA cloud password</Label>
                <Input id="pw" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
              </div>
              {error && <p className="font-mono text-xs text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="size-4 animate-spin" />}
                Confirm
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
