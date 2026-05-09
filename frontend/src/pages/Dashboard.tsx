import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { api, unwrap } from '../api/client'
import { Post, SourceChannel } from '../types'
import AppShell from '@/components/AppShell'
import PostCard from '@/components/PostCard'
import PostEditor from '@/components/PostEditor'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useChannels } from '@/contexts/ChannelsContext'

interface Props {
  onLogout: () => void
}

export default function Dashboard({ onLogout }: Props) {
  const ch = useChannels()
  const selectedSource = ch.selectedSource
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [fetching, setFetching] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [savingPrompt, setSavingPrompt] = useState(false)

  const loadPosts = useCallback(async (src: SourceChannel) => {
    setLoadingPosts(true)
    try {
      const res = await api.get(`/posts?source_channel_id=${src.id}`)
      setPosts(unwrap<Post[]>(res))
    } finally {
      setLoadingPosts(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSource) loadPosts(selectedSource)
    else setPosts([])
    setSelectedPost(null)
    setPromptOpen(false)
  }, [selectedSource, loadPosts])

  async function handleSavePrompt() {
    if (!selectedSource) return
    setSavingPrompt(true)
    try {
      const res = await api.patch(`/channels/sources/${selectedSource.id}`, { prompt: promptText })
      const updated = unwrap<SourceChannel>(res)
      ch.updateSource(updated)
      setPromptOpen(false)
      toast.success('Prompt saved')
    } finally {
      setSavingPrompt(false)
    }
  }

  async function handleFetch() {
    if (!selectedSource) return
    setFetching(true)
    try {
      const res = await api.post(`/posts/fetch?source_channel_id=${selectedSource.id}`)
      const newPosts = unwrap<Post[]>(res)
      if (newPosts.length > 0) {
        setPosts(prev => [...newPosts, ...prev])
        toast.success(`${newPosts.length} new posts fetched`)
      } else {
        toast.info('No new posts found')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Fetch failed')
    } finally {
      setFetching(false)
    }
  }

  function handlePostUpdate(updated: Post) {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))
    if (selectedPost?.id === updated.id) setSelectedPost(updated)
  }

  const header = selectedSource ? (
    <div className="flex flex-1 items-center justify-between">
      <div className="flex flex-col">
        <span className="font-mono text-sm font-medium">@{selectedSource.username}</span>
        <span className="text-xs text-muted-foreground">{selectedSource.title}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPromptText(selectedSource.prompt || '')
            setPromptOpen(true)
          }}
        >
          <Sparkles className="size-4" />
          {selectedSource.prompt ? 'Edit prompt' : 'Set prompt'}
        </Button>
        <Button size="sm" onClick={handleFetch} disabled={fetching}>
          {fetching ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Fetching…
            </>
          ) : (
            <>
              <RefreshCw className="size-4" />
              Fetch posts
            </>
          )}
        </Button>
      </div>
    </div>
  ) : (
    <span className="label">Select a source channel</span>
  )

  return (
    <AppShell onLogout={onLogout} header={header}>
      {selectedSource ? (
        loadingPosts ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="label">No posts yet — click Fetch posts</span>
          </div>
        ) : (
          <div className="h-full divide-y divide-border overflow-y-auto">
            {posts.map(post => (
              <PostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </div>
        )
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="label">Pick a source from the sidebar</span>
        </div>
      )}

      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI rewrite prompt</DialogTitle>
            <DialogDescription>
              Custom system prompt for this source. Leave empty to use the default.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
            rows={8}
            placeholder="You are a copywriter for a Telegram channel. Rewrite the post in a fresh, engaging style. Preserve all facts. Return ONLY the rewritten text."
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrompt} disabled={savingPrompt}>
              {savingPrompt && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedPost && (
        <PostEditor
          post={selectedPost}
          myChannels={ch.myChannels}
          onClose={() => setSelectedPost(null)}
          onUpdate={handlePostUpdate}
        />
      )}
    </AppShell>
  )
}
