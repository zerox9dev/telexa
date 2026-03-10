import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
    if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set')

    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No auth')

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) throw new Error('Unauthorized')

    const { action, postId, channelUsername } = await req.json()

    // === Connect channel ===
    if (action === 'connect-channel') {
      if (!channelUsername) throw new Error('channelUsername required')
      const chatId = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`

      const botRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`)
      const botData = await botRes.json()
      if (!botData.ok) throw new Error('Invalid bot token')

      const chatRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId }),
      })
      const chatData = await chatRes.json()
      if (!chatData.ok) throw new Error(`Cannot access channel. Add @${botData.result.username} as admin to ${chatId}`)

      const memberRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatData.result.id, user_id: botData.result.id }),
      })
      const memberData = await memberRes.json()
      if (!memberData.ok || !['administrator', 'creator'].includes(memberData.result.status)) {
        throw new Error(`Bot is not admin in "${chatData.result.title}"`)
      }

      // Check for duplicate
      const { data: existing } = await supabase.from('channels')
        .select('id').eq('user_id', user.id).eq('chat_id', String(chatData.result.id)).maybeSingle()
      if (existing) throw new Error('This channel is already connected')

      const countRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMemberCount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatData.result.id }),
      })
      const countData = await countRes.json()

      const { data: channel, error: insertErr } = await supabase.from('channels').insert({
        user_id: user.id,
        bot_token: 'server-managed',
        chat_id: String(chatData.result.id),
        title: chatData.result.title,
        username: chatData.result.username || null,
        member_count: countData.ok ? countData.result : null,
      }).select().single()

      if (insertErr) throw new Error(insertErr.message)
      return new Response(JSON.stringify({ ok: true, channel }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === Send post now ===
    if (action === 'send-post') {
      if (!postId) throw new Error('postId required')

      const { data: post } = await supabase
        .from('posts').select('*')
        .eq('id', postId).eq('user_id', user.id).single()
      if (!post) throw new Error('Post not found')

      const { data: channel } = await supabase
        .from('channels').select('*')
        .eq('id', post.channel_id).single()
      if (!channel) throw new Error('Channel not found')

      const tgResult = await sendToTelegram(BOT_TOKEN, channel.chat_id, post)

      if (!tgResult.ok) {
        await supabase.from('posts').update({
          status: 'failed', error: tgResult.description, updated_at: new Date().toISOString(),
        }).eq('id', postId)
        throw new Error(tgResult.description || 'Telegram error')
      }

      await supabase.from('posts').update({
        status: 'published', published_at: new Date().toISOString(),
        telegram_message_id: tgResult.result?.message_id || null,
        error: null, updated_at: new Date().toISOString(),
      }).eq('id', postId)

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === Process all due scheduled posts ===
    if (action === 'process-scheduled') {
      const { data: duePosts } = await supabase
        .from('posts').select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString())

      let sent = 0, failed = 0
      for (const post of (duePosts || [])) {
        const { data: channel } = await supabase
          .from('channels').select('*')
          .eq('id', post.channel_id).single()
        if (!channel) { failed++; continue }

        const tgResult = await sendToTelegram(BOT_TOKEN, channel.chat_id, post)
        if (tgResult.ok) {
          await supabase.from('posts').update({
            status: 'published', published_at: new Date().toISOString(),
            telegram_message_id: tgResult.result?.message_id || null,
            error: null, updated_at: new Date().toISOString(),
          }).eq('id', post.id)
          sent++
        } else {
          await supabase.from('posts').update({
            status: 'failed', error: tgResult.description,
            updated_at: new Date().toISOString(),
          }).eq('id', post.id)
          failed++
        }
      }

      return new Response(JSON.stringify({ ok: true, sent, failed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Helper: send message or photo to Telegram
async function sendToTelegram(token: string, chatId: string, post: any) {
  if (post.media_url) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId, photo: post.media_url,
        caption: post.text || undefined, parse_mode: 'HTML',
      }),
    })
    return res.json()
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: post.text, parse_mode: 'HTML' }),
  })
  return res.json()
}
