import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getBot, getChat, getChatMemberCount, isBotAdmin } from '../lib/telegram'
import { useAuth } from '../lib/auth'
import type { Channel } from '../lib/database.types'

export function useChannels() {
  const { user } = useAuth()
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChannels = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('channels')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setChannels(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  const connectBot = async (botToken: string, channelUsername: string) => {
    if (!user) throw new Error('Not authenticated')

    // 1. Validate bot
    const bot = await getBot(botToken)

    // 2. Get channel info
    const chatId = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`
    const chat = await getChat(botToken, chatId)

    // 3. Check bot is admin
    const isAdmin = await isBotAdmin(botToken, chat.id, bot.id)
    if (!isAdmin) {
      throw new Error(`Bot @${bot.username} is not an admin in "${chat.title}". Add it as admin first.`)
    }

    // 4. Get member count
    const memberCount = await getChatMemberCount(botToken, chat.id)

    // 5. Save to Supabase
    const { data, error } = await supabase.from('channels').insert({
      user_id: user.id,
      bot_token: botToken,
      chat_id: String(chat.id),
      title: chat.title,
      username: chat.username || null,
      member_count: memberCount,
    }).select().single()

    if (error) throw error
    setChannels(prev => [data, ...prev])
    return data
  }

  const removeChannel = async (channelId: string) => {
    await supabase.from('channels').delete().eq('id', channelId)
    setChannels(prev => prev.filter(c => c.id !== channelId))
  }

  return { channels, loading, connectBot, removeChannel, refetch: fetchChannels }
}
