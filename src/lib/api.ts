import { supabase, isSupabaseConfigured } from './supabase'

const FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-post`
  : ''

async function callEdgeFunction(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not logged in')

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'Edge function error')
  return data
}

/** Connect a channel via the server-side bot */
export async function connectChannel(channelUsername: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured')
  return callEdgeFunction({ action: 'connect-channel', channelUsername })
}

/** Send a post via the server-side bot */
export async function sendPostViaServer(postId: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured')
  return callEdgeFunction({ action: 'send-post', postId })
}

/** Trigger processing of all due scheduled posts */
export async function processScheduledPosts() {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured')
  return callEdgeFunction({ action: 'process-scheduled' })
}
