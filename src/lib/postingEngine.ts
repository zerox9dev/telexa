import type { Post, Channel } from './database.types'
import { sendMessage, sendPhoto } from './telegram'

const POSTS_KEY = 'telexa_posts'
const CHANNELS_KEY = 'telexa_channels'

function loadPosts(): Post[] {
  try { return JSON.parse(localStorage.getItem(POSTS_KEY) || '[]') }
  catch { return [] }
}

function savePosts(posts: Post[]) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts))
}

function loadChannels(): Channel[] {
  try { return JSON.parse(localStorage.getItem(CHANNELS_KEY) || '[]') }
  catch { return [] }
}

/** Send a single post to Telegram */
export async function publishPost(post: Post): Promise<Post> {
  const channels = loadChannels()
  const channel = channels.find(c => c.id === post.channel_id)

  if (!channel) throw new Error('Channel not found')
  if (!channel.bot_token) throw new Error('Bot token missing')
  if (!post.text.trim()) throw new Error('Post text is empty')

  try {
    if (post.media_url) {
      await sendPhoto(channel.bot_token, channel.chat_id, post.media_url, post.text)
    } else {
      await sendMessage(channel.bot_token, channel.chat_id, post.text)
    }

    // Update in storage
    const all = loadPosts()
    const idx = all.findIndex(p => p.id === post.id)
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        status: 'published',
        published_at: new Date().toISOString(),
        error: null,
        updated_at: new Date().toISOString(),
      }
      savePosts(all)
      return all[idx]
    }
    return { ...post, status: 'published', published_at: new Date().toISOString() }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    // Mark as failed
    const all = loadPosts()
    const idx = all.findIndex(p => p.id === post.id)
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        status: 'failed',
        error: errorMsg,
        updated_at: new Date().toISOString(),
      }
      savePosts(all)
    }
    throw err
  }
}

/** Check for due scheduled posts and publish them */
export async function processDuePosts(): Promise<{ sent: number; failed: number }> {
  const now = Date.now()
  const all = loadPosts()
  let sent = 0
  let failed = 0

  const due = all.filter(
    p => p.status === 'scheduled' && p.scheduled_at && new Date(p.scheduled_at).getTime() <= now
  )

  for (const post of due) {
    try {
      await publishPost(post)
      sent++
    } catch {
      failed++
    }
    // Small delay between posts to avoid TG rate limits
    if (due.indexOf(post) < due.length - 1) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  return { sent, failed }
}
