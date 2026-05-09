import { Image as ImageIcon } from 'lucide-react'
import { Post } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  post: Post
  onClick: () => void
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const STATUS_CLASS: Record<Post['status'], string> = {
  new: 'bg-primary/15 text-primary',
  ready: 'bg-blue-500/15 text-blue-400',
  sent: 'bg-emerald-500/15 text-emerald-400',
  discarded: 'bg-muted text-muted-foreground',
}

export default function PostCard({ post, onClick }: Props) {
  const mediaCount = post.media_paths?.length ?? 0

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
    >
      <Badge
        variant="outline"
        className={cn('shrink-0 font-mono text-[10px] uppercase tracking-wider', STATUS_CLASS[post.status])}
      >
        {post.status}
      </Badge>

      <span className="flex-1 truncate text-sm">
        {post.original_text
          ? post.original_text.slice(0, 140) + (post.original_text.length > 140 ? '…' : '')
          : <span className="text-muted-foreground">[no text]</span>
        }
      </span>

      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground font-mono">
        {mediaCount > 0 && (
          <span className="flex items-center gap-1 text-primary">
            <ImageIcon className="size-3" />
            {mediaCount}
          </span>
        )}
        <span>{formatRelativeTime(post.created_at)}</span>
      </div>
    </button>
  )
}
