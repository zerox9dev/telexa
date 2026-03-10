import type { Post, Channel } from './database.types'
import { sendMessage, sendPhoto } from './telegram'
import { supabase, isSupabaseConfigured } from './supabase'

function loadPosts(): Post[] {
  try { return JSON.parse(localStorage.getItem('telexa_posts') || '[]') }
  catch { return [] }
}
function loadChannels(): Channel[] {
  try { return JSON.parse(localStorage.getItem('telexa_channels') || '[]') }
  catch { return [] }
}
function savePosts(posts: Post[]) {
  localStorage.setItem('telexa_posts', JSON.stringify(posts))
}

export async function publishPost(post: Post): Promise<Post> {
  let channel: Channel | undefined

  if (!isSupabaseConfigured) {
    channel = loadChannels().find(c => c.id === post.channel_id)
  } else {
    const { data } = await (supabase as any).from('channels').select('*').eq('id', post.channel_id).single()
    channel = data || undefined
  }

  if (!channel) throw new Error('Channel not found')
  if (!channel.bot_token) throw new Error('Bot token missing')
  if (!post.text?.trim() && !post.media_url) throw new Error('Post is empty')

  try {
    if (post.media_url) {
      await sendPhoto(channel.bot_token, channel.chat_id, post.media_url, post.text)
    } else {
      await sendMessage(channel.bot_token, channel.chat_id, post.text)
    }

    const updated = {
      ...post,
      status: 'published' as const,
      published_at: new Date().toISOString(),
      error: null,
      updated_at: new Date().toISOString(),
    }

    if (!isSupabaseConfigured) {
      const all = loadPosts()
      const idx = all.findIndex(p => p.id === post.id)
      if (idx !== -1) {
        all[idx] = updated
        savePosts(all)
      }
    } else {
      await (supabase as any).from('posts').update({
        status: updated.status,
        published_at: updated.published_at,
        error: null,
        updated_at: updated.updated_at
      }).eq('id', post.id)
    }
    
    return updated
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    const failed = {
      ...post,
      status: 'failed' as const,
      error: errorMsg,
      updated_at: new Date().toISOString(),
    }

    if (!isSupabaseConfigured) {
      const all = loadPosts()
      const idx = all.findIndex(p => p.id === post.id)
      if (idx !== -1) {
        all[idx] = failed
        savePosts(all)
      }
    } else {
      await (supabase as any).from('posts').update({
        status: failed.status,
        error: failed.error,
        updated_at: failed.updated_at
      }).eq('id', post.id)
    }
    
    throw err
  }
}

export async function processDuePosts(): Promise<{ sent: number; failed: number }> {
  const now = new Date().toISOString()
  let due: Post[] = []

  if (!isSupabaseConfigured) {
    const all = loadPosts()
    const nowMs = Date.now()
    due = all.filter(p => p.status === 'scheduled' && p.scheduled_at && new Date(p.scheduled_at).getTime() <= nowMs)
  } else {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
    if (data) due = data
  }

  let sent = 0
  let failed = 0

  for (const post of due) {
    try {
      await publishPost(post)
      sent++
    } catch {
      failed++
    }
    if (due.indexOf(post) < due.length - 1) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  return { sent, failed }
}
