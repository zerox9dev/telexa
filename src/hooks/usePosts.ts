import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Post, PostStatus } from '../lib/database.types'

interface CreatePostInput {
  channel_id: string
  text: string
  media_url?: string
  scheduled_at?: string
  status?: PostStatus
}

export function usePosts(channelId?: string) {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(async () => {
    if (!user) return
    setLoading(true)

    let query = supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: true, nullsFirst: false })

    if (channelId) {
      query = query.eq('channel_id', channelId)
    }

    const { data } = await query
    setPosts(data || [])
    setLoading(false)
  }, [user, channelId])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const createPost = async (input: CreatePostInput) => {
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase.from('posts').insert({
      user_id: user.id,
      channel_id: input.channel_id,
      text: input.text,
      media_url: input.media_url || null,
      scheduled_at: input.scheduled_at || null,
      status: input.status || (input.scheduled_at ? 'scheduled' : 'draft'),
      published_at: null,
      views: null,
      error: null,
    }).select().single()

    if (error) throw error
    setPosts(prev => [...prev, data])
    return data
  }

  const updatePost = async (postId: string, updates: Partial<CreatePostInput>) => {
    const { data, error } = await supabase
      .from('posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select()
      .single()

    if (error) throw error
    setPosts(prev => prev.map(p => p.id === postId ? data : p))
    return data
  }

  const deletePost = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId)
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
