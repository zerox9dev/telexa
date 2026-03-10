import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Post, PostStatus } from '../lib/database.types'
import { publishPost } from '../lib/postingEngine'

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

  const fetchPosts = useCallback(async () => {
    if (!isSupabaseConfigured) {
      try {
        let all: Post[] = JSON.parse(localStorage.getItem('telexa_posts') || '[]')
        if (channelId) all = all.filter(p => p.channel_id === channelId)
        all.sort((a, b) => {
          if (a.scheduled_at && b.scheduled_at) return a.scheduled_at.localeCompare(b.scheduled_at)
          if (a.scheduled_at) return -1
          if (b.scheduled_at) return 1
          return b.created_at.localeCompare(a.created_at)
        })
        setPosts(all)
      } catch { setPosts([]) }
      setLoading(false)
      return
    }

    let q = (supabase as any).from('posts').select('*').order('scheduled_at', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
    if (channelId) q = q.eq('channel_id', channelId)

    const { data, error } = await q
    if (!error && data) setPosts(data)
    setLoading(false)
  }, [channelId])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const createPost = async (input: CreatePostInput) => {
    const status = input.status || (input.scheduled_at ? 'scheduled' : 'draft')
    
    if (!isSupabaseConfigured) {
      const post: Post = {
        id: crypto.randomUUID(),
        user_id: 'local-user',
        channel_id: input.channel_id,
        text: input.text,
        media_url: input.media_url || null,
        status,
        scheduled_at: input.scheduled_at || null,
        published_at: null,
        views: null,
        error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const all: Post[] = JSON.parse(localStorage.getItem('telexa_posts') || '[]')
      all.push(post)
      localStorage.setItem('telexa_posts', JSON.stringify(all))
      setPosts(prev => [...prev, post])
      return post
    }

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not logged in')

    const { data, error } = await (supabase as any).from('posts').insert({
      user_id: user.user.id,
      channel_id: input.channel_id,
      text: input.text,
      media_url: input.media_url || null,
      status,
      scheduled_at: input.scheduled_at || null,
    }).select().single()

    if (error) throw new Error(error.message)
    if (data) setPosts(prev => [...prev, data])
    return data
  }

  const updatePost = async (postId: string, updates: Partial<CreatePostInput>) => {
    if (!isSupabaseConfigured) {
      const all: Post[] = JSON.parse(localStorage.getItem('telexa_posts') || '[]')
      const idx = all.findIndex(p => p.id === postId)
      if (idx === -1) throw new Error('Post not found')
      
      all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() }
      localStorage.setItem('telexa_posts', JSON.stringify(all))
      setPosts(prev => prev.map(p => p.id === postId ? all[idx] : p))
      return all[idx]
    }

    const { data, error } = await (supabase as any).from('posts').update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq('id', postId).select().single()

    if (error) throw new Error(error.message)
    if (data) setPosts(prev => prev.map(p => p.id === postId ? data : p))
    return data
  }

  const deletePost = async (postId: string) => {
    if (!isSupabaseConfigured) {
      const all: Post[] = JSON.parse(localStorage.getItem('telexa_posts') || '[]')
      const filtered = all.filter(p => p.id !== postId)
      localStorage.setItem('telexa_posts', JSON.stringify(filtered))
      setPosts(prev => prev.filter(p => p.id !== postId))
      return
    }

    const { error } = await (supabase as any).from('posts').delete().eq('id', postId)
    if (error) throw new Error(error.message)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const sendNow = async (postId: string) => {
    if (!isSupabaseConfigured) {
      const all: Post[] = JSON.parse(localStorage.getItem('telexa_posts') || '[]')
      const post = all.find(p => p.id === postId)
      if (!post) throw new Error('Post not found')
      const updated = await publishPost(post)
      setPosts(prev => prev.map(p => p.id === postId ? updated : p))
      return updated
    }

    // Supabase mode
    const post = posts.find(p => p.id === postId)
    if (!post) throw new Error('Post not found')
    
    const updated = await publishPost(post)
    
    const { data, error } = await (supabase as any).from('posts').update({
      status: updated.status,
      published_at: updated.published_at,
      error: updated.error,
      updated_at: new Date().toISOString()
    }).eq('id', postId).select().single()

    if (error) throw new Error(error.message)
    if (data) setPosts(prev => prev.map(p => p.id === postId ? data : p))
    return data
  }

  return {
    posts,
    scheduled: posts.filter(p => p.status === 'scheduled'),
    drafts: posts.filter(p => p.status === 'draft'),
    published: posts.filter(p => p.status === 'published'),
    failed: posts.filter(p => p.status === 'failed'),
    loading,
    createPost,
    updatePost,
    deletePost,
    sendNow,
    refetch: fetchPosts,
  }
}
