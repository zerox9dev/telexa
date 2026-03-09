import { useCallback, useEffect, useState } from 'react'
import { getBot, getChat, getChatMemberCount, isBotAdmin } from '../lib/telegram'
import type { Channel } from '../lib/database.types'

const STORAGE_KEY = 'telexa_channels'

function loadChannels(): Channel[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveChannels(channels: Channel[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels))
}

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChannels = useCallback(() => {
    setChannels(loadChannels())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  const connectBot = async (botToken: string, channelUsername: string) => {
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

    // 5. Save locally
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
    saveChannels(updated)
    return channel
  }

  const removeChannel = async (channelId: string) => {
    const updated = channels.filter(c => c.id !== channelId)
    setChannels(updated)
    saveChannels(updated)
  }

  return { channels, loading, connectBot, removeChannel, refetch: fetchChannels }
}
