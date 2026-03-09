const TG_API = 'https://api.telegram.org/bot'

interface TgChat {
  id: number
  title: string
  username?: string
  type: string
}

interface TgBotInfo {
  id: number
  first_name: string
  username: string
}

interface TgChatMember {
  status: string
}

async function tgFetch<T>(token: string, method: string, params?: Record<string, unknown>): Promise<T> {
  const url = `${TG_API}${token}/${method}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: params ? JSON.stringify(params) : undefined,
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.description || 'Telegram API error')
  return data.result as T
}

/** Validate bot token and get bot info */
export async function getBot(token: string): Promise<TgBotInfo> {
  return tgFetch<TgBotInfo>(token, 'getMe')
}

/** Get chat info (channel must have bot as admin) */
export async function getChat(token: string, chatId: string | number): Promise<TgChat> {
  return tgFetch<TgChat>(token, 'getChat', { chat_id: chatId })
}

/** Get member count */
export async function getChatMemberCount(token: string, chatId: string | number): Promise<number> {
  return tgFetch<number>(token, 'getChatMemberCount', { chat_id: chatId })
}

/** Check if bot is admin in channel */
export async function isBotAdmin(token: string, chatId: string | number, botId: number): Promise<boolean> {
  try {
    const member = await tgFetch<TgChatMember>(token, 'getChatMember', {
      chat_id: chatId,
      user_id: botId,
    })
    return ['administrator', 'creator'].includes(member.status)
  } catch {
    return false
  }
}

/** Send a text message to a channel */
export async function sendMessage(
  token: string,
  chatId: string | number,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML',
) {
  return tgFetch(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
  })
}

/** Send photo with caption */
export async function sendPhoto(
  token: string,
  chatId: string | number,
  photo: string,
  caption?: string,
) {
  return tgFetch(token, 'sendPhoto', {
    chat_id: chatId,
    photo,
    caption,
    parse_mode: 'HTML',
  })
}
