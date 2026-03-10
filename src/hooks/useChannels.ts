import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { connectChannel as connectChannelViaServer } from '../lib/api'
import { getBot, getChat, getChatMemberCount, isBotAdmin } from '../lib/telegram'
import type { Channel } from '../lib/database.types'

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChannels = useCallback(async () => {
    if (!isSupabaseConfigured) {
      try {
        setChannels(JSON.parse(localStorage.getItem('telexa_channels') || '[]'))
      } catch { setChannels([]) }
      setLoading(false)
      return
    }

    const { data, error } = await (supabase as any)
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setChannels(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  const connectBot = async (channelUsername: string, botToken?: string) => {
    // Supabase mode: use Edge Function (server-side bot)
    if (isSupabaseConfigured) {
      const result = await connectChannelViaServer(channelUsername)
      if (result.channel) setChannels(prev => [result.channel, ...prev])
      return result.channel
    }

    // Local mode: user provides their own bot token
    if (!botToken) throw new Error('Токен бота обов\'язковий у локальному режимі')
    const bot = await getBot(botToken)
    const chatId = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`
    const chat = await getChat(botToken, chatId)

    const isAdmin = await isBotAdmin(botToken, chat.id, bot.id)
    if (!isAdmin) {
      throw new Error(`Бот @${bot.username} не є адміном у "${chat.title}". Спочатку додайте його як адміна.`)
    }

    const memberCount = await getChatMemberCount(botToken, chat.id)

    const channel: Channel = {
      id: crypto.randomUUID(),
      user_id: 'local-user',
      bot_token: botToken,
      chat_id: String(chat.id),
      title: chat.title,
      username: chat.username || null,
      member_count: memberCount,
      created_at: new Date().toISOString(),
    }
    const updated = [channel, ...channels]
    setChannels(updated)
    localStorage.setItem('telexa_channels', JSON.stringify(updated))
    return channel
  }

  const removeChannel = async (channelId: string) => {
    if (!isSupabaseConfigured) {
      const updated = channels.filter(c => c.id !== channelId)
      setChannels(updated)
      localStorage.setItem('telexa_channels', JSON.stringify(updated))
      return
    }

    const { error } = await (supabase as any).from('channels').delete().eq('id', channelId)
    if (error) throw new Error(error.message)
    setChannels(prev => prev.filter(c => c.id !== channelId))
  }

  return { channels, loading, connectBot, removeChannel, refetch: fetchChannels }
}
