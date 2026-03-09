import { useCallback, useEffect, useState } from 'react'
import type { Post, PostStatus } from '../lib/database.types'

const STORAGE_KEY = 'telexa_posts'

function loadPosts(): Post[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function savePosts(posts: Post[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

interface CreatePostInput {
  channel_id: string
  text: string
  media_url?: string
  scheduled_at?: string
  status?: PostStatus
}

export function usePosts(channelId?: string) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(() => {
    let all = loadPosts()
    if (channelId) {
      all = all.filter(p => p.channel_id === channelId)
    }
    all.sort((a, b) => {
      if (a.scheduled_at && b.scheduled_at) return a.scheduled_at.localeCompare(b.scheduled_at)
      if (a.scheduled_at) return -1
      if (b.scheduled_at) return 1
      return b.created_at.localeCompare(a.created_at)
    })
    setPosts(all)
    setLoading(false)
  }, [channelId])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const createPost = async (input: CreatePostInput) => {
    const now = new Date().toISOString()
    const post: Post = {
      id: crypto.randomUUID(),
      user_id: 'local-user',
      channel_id: input.channel_id,
      text: input.text,
      media_url: input.media_url || null,
      status: input.status || (input.scheduled_at ? 'scheduled' : 'draft'),
      scheduled_at: input.scheduled_at || null,
      published_at: null,
      views: null,
      error: null,
      created_at: now,
      updated_at: now,
    }

    const all = loadPosts()
    all.push(post)
    savePosts(all)
    setPosts(prev => [...prev, post])
    return post
  }

  const updatePost = async (postId: string, updates: Partial<CreatePostInput>) => {
    const all = loadPosts()
    const idx = all.findIndex(p => p.id === postId)
    if (idx === -1) throw new Error('Post not found')

    all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() }
    savePosts(all)
    setPosts(prev => prev.map(p => p.id === postId ? all[idx] : p))
    return all[idx]
  }

  const deletePost = async (postId: string) => {
    const all = loadPosts().filter(p => p.id !== postId)
    savePosts(all)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const scheduled = posts.filter(p => p.status === 'scheduled')
  const drafts = posts.filter(p => p.status === 'draft')
  const published = posts.filter(p => p.status === 'published')

  return {
    posts,
    scheduled,
    drafts,
    published,
    loading,
    createPost,
    updatePost,
    deletePost,
    refetch: fetchPosts,
  }
}
