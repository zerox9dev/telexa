import { useEffect, useState } from 'react'
import { Loader2, Send, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, unwrap } from '../api/client'
import { MyChannel, Post } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function parseMarkdown(text: string) {
  if (!text) return null
  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  result = result.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>')
  result = result.replace(
    /`(.+?)`/g,
    '<code class="rounded-sm bg-muted px-1 py-0.5 font-mono text-xs">$1</code>'
  )
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline">$1</a>'
  )
  return <span dangerouslySetInnerHTML={{ __html: result }} />
}

const STATUS_CLASS: Record<Post['status'], string> = {
  new: 'bg-primary/15 text-primary',
  ready: 'bg-blue-500/15 text-blue-400',
  sent: 'bg-emerald-500/15 text-emerald-400',
  discarded: 'bg-muted text-muted-foreground',
}

interface Props {
  post: Post
  myChannels: MyChannel[]
  onClose: () => void
  onUpdate: (post: Post) => void
}

export default function PostEditor({ post, myChannels, onClose, onUpdate }: Props) {
  const [rewritten, setRewritten] = useState(post.rewritten_text || '')
  const [rewriting, setRewriting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [targetChannelId, setTargetChannelId] = useState<string>(
    String(post.target_channel_id || myChannels[0]?.id || '')
  )
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const mediaPaths = post.media_paths || []
  const mediaTypes = post.media_types || []

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && lightboxSrc) {
        e.stopPropagation()
        setLightboxSrc(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxSrc])

  async function handleRewrite() {
    setRewriting(true)
    try {
      const res = await api.post(`/posts/${post.id}/rewrite`)
      const data = unwrap<{ rewritten_text: string }>(res)
      setRewritten(data.rewritten_text)
      onUpdate({ ...post, rewritten_text: data.rewritten_text, status: 'ready' })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Rewrite failed')
    } finally {
      setRewriting(false)
    }
  }

  async function handleSaveEdit() {
    try {
      const res = await api.patch(`/posts/${post.id}`, { rewritten_text: rewritten })
      const updated = unwrap<Post>(res)
      onUpdate(updated)
    } catch { /* ignore */ }
  }

  async function handlePublish() {
    if (!targetChannelId) return
    setPublishing(true)
    try {
      await api.patch(`/posts/${post.id}`, { rewritten_text: rewritten })
    } catch { /* ignore */ }
    try {
      const res = await api.post(`/posts/${post.id}/publish?target_channel_id=${targetChannelId}`)
      unwrap<{ sent_at: string }>(res)
      onUpdate({ ...post, rewritten_text: rewritten, status: 'sent' })
      toast.success('Published')
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  async function handleDiscard() {
    setDiscarding(true)
    try {
      await api.post(`/posts/${post.id}/discard`)
      onUpdate({ ...post, status: 'discarded' })
      toast.info('Post discarded')
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Discard failed')
    } finally {
      setDiscarding(false)
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[90vh] max-h-[90vh] w-[95vw] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn('font-mono text-[10px] uppercase tracking-wider', STATUS_CLASS[post.status])}
            >
              {post.status}
            </Badge>
            <span className="label">Message #{post.message_id}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {mediaPaths.length > 0 && (
          <div className="flex shrink-0 gap-2 overflow-x-auto border-b bg-muted/30 px-4 py-3">
            {mediaPaths.map((path, i) => (
              <button
                key={i}
                onClick={() => mediaTypes[i] === 'photo' && setLightboxSrc(`/${path}`)}
                className="size-20 shrink-0 overflow-hidden rounded-sm border bg-background"
              >
                {mediaTypes[i] === 'photo' ? (
                  <img src={`/${path}`} alt="" className="size-full object-cover" />
                ) : (
                  <video src={`/${path}`} className="size-full object-cover" muted />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2 md:divide-x">
          <div className="flex flex-col overflow-hidden p-5">
            <div className="label mb-3">Original</div>
            <div className="flex-1 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {parseMarkdown(post.original_text) || '—'}
            </div>
          </div>
          <div className="flex flex-col overflow-hidden p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="label">Rewritten</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                *bold* _italic_ `code` [link](url)
              </span>
            </div>
            <Textarea
              value={rewritten}
              onChange={e => setRewritten(e.target.value)}
              onBlur={handleSaveEdit}
              placeholder="Click 'Rewrite with AI' or type here…"
              className="flex-1 resize-none text-sm"
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRewrite} disabled={rewriting} size="sm">
              {rewriting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Rewriting…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {post.rewritten_text ? 'Rewrite again' : 'Rewrite with AI'}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              disabled={discarding}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Discard
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={targetChannelId} onValueChange={setTargetChannelId}>
              <SelectTrigger size="sm" className="min-w-[180px]">
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                {myChannels.map(ch => (
                  <SelectItem key={ch.id} value={String(ch.id)}>
                    {ch.title || ch.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishing || !rewritten || !targetChannelId}
              className="bg-emerald-500 text-emerald-50 hover:bg-emerald-600"
            >
              {publishing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Publishing…
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Publish
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[200] flex cursor-zoom-out items-center justify-center bg-black/85"
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" />
        </div>
      )}
    </Dialog>
  )
}
