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

export async function getBot(token: string): Promise<TgBotInfo> {
  return tgFetch<TgBotInfo>(token, 'getMe')
}

export async function getChat(token: string, chatId: string | number): Promise<TgChat> {
  return tgFetch<TgChat>(token, 'getChat', { chat_id: chatId })
}

export async function getChatMemberCount(token: string, chatId: string | number): Promise<number> {
  return tgFetch<number>(token, 'getChatMemberCount', { chat_id: chatId })
}

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

/** Send photo with caption using Base64 Data URL or HTTP URL */
export async function sendPhoto(
  token: string,
  chatId: string | number,
  photoUrl: string,
  caption?: string,
) {
  const url = `${TG_API}${token}/sendPhoto`
  const formData = new FormData()
  formData.append('chat_id', String(chatId))
  formData.append('parse_mode', 'HTML')
  if (caption) formData.append('caption', caption)

  // If it's a data URL (Base64), convert to Blob
  if (photoUrl.startsWith('data:image')) {
    const res = await fetch(photoUrl)
    const blob = await res.blob()
    formData.append('photo', blob, 'image.jpg')
  } else {
    // If it's a regular HTTP URL, just send the URL string
    formData.append('photo', photoUrl)
  }

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.description || 'Telegram API error sending photo')
  return data.result
}
