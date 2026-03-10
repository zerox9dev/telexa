import type { Post, Channel } from './database.types'
import { sendMessage, sendPhoto } from './telegram'
import { isSupabaseConfigured } from './supabase'
import { sendPostViaServer, processScheduledPosts as processViaServer } from './api'

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
  // Supabase mode: use Edge Function (server-side bot, secure)
  if (isSupabaseConfigured) {
    await sendPostViaServer(post.id)
    return {
      ...post,
      status: 'published',
      published_at: new Date().toISOString(),
      error: null,
      updated_at: new Date().toISOString(),
    }
  }

  // Local mode: direct Telegram API calls (user's own bot token)
  const channel = loadChannels().find(c => c.id === post.channel_id)
  if (!channel) throw new Error('Канал не знайдено')
  if (!channel.bot_token) throw new Error('Токен бота відсутній')
  if (!post.text?.trim() && !post.media_url) throw new Error('Пост порожній')

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

    const all = loadPosts()
    const idx = all.findIndex(p => p.id === post.id)
    if (idx !== -1) { all[idx] = updated; savePosts(all) }
    return updated
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    const failed = {
      ...post,
      status: 'failed' as const,
      error: errorMsg,
      updated_at: new Date().toISOString(),
    }
    const all = loadPosts()
    const idx = all.findIndex(p => p.id === post.id)
    if (idx !== -1) { all[idx] = failed; savePosts(all) }
    throw err
  }
}

export async function processDuePosts(): Promise<{ sent: number; failed: number }> {
  // Supabase mode: let the Edge Function handle it
  if (isSupabaseConfigured) {
    return processViaServer()
  }

  // Local mode
  const nowMs = Date.now()
  const all = loadPosts()
  const due = all.filter(p => p.status === 'scheduled' && p.scheduled_at && new Date(p.scheduled_at).getTime() <= nowMs)

  let sent = 0, failed = 0
  for (const post of due) {
    try {
      await publishPost(post)
      sent++
    } catch { failed++ }
    if (due.indexOf(post) < due.length - 1) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  return { sent, failed }
}
