const SETTINGS_KEY = 'telexa_settings'

interface AiSettings {
  provider: 'openai' | 'anthropic'
  apiKey: string
  model: string
}

export function getAiSettings(): AiSettings | null {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    if (!raw.aiApiKey) return null
    return {
      provider: raw.aiProvider || 'openai',
      apiKey: raw.aiApiKey,
      model: raw.aiModel || (raw.aiProvider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o-mini'),
    }
  } catch {
    return null
  }
}

export function saveAiSettings(provider: string, apiKey: string, model?: string) {
  const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
  raw.aiProvider = provider
  raw.aiApiKey = apiKey
  if (model) raw.aiModel = model
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(raw))
}

interface GenerateOptions {
  topic: string
  channelName?: string
  tone?: 'casual' | 'professional' | 'educational' | 'provocative'
  language?: string
  maxLength?: number
}

const SYSTEM_PROMPT = `You are a Telegram channel post writer. Write engaging posts for Telegram channels.

Rules:
- Write in the specified language
- NO excessive emojis (max 3-4 per post)
- NO long dashes (—), use short ones (-) or none
- NO formal/corporate tone unless asked
- Sound like a real person, not AI
- Keep it concise — Telegram posts should be scannable
- Use line breaks for readability
- End with a question or call to action when appropriate
- Max 4096 characters (Telegram limit)
- Do NOT wrap in quotes or add meta-commentary — just the post text`

async function callOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.8,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `OpenAI error: ${res.status}`)
  }

  const data = await res.json()
  return data.choices[0]?.message?.content?.trim() || ''
}

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Anthropic error: ${res.status}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text?.trim() || ''
}

export async function generatePost(options: GenerateOptions): Promise<string> {
  const settings = getAiSettings()
  if (!settings) throw new Error('AI not configured. Add your API key in Settings.')

  const prompt = [
    `Write a Telegram channel post about: ${options.topic}`,
    options.channelName && `Channel: ${options.channelName}`,
    `Tone: ${options.tone || 'casual'}`,
    `Language: ${options.language || 'English'}`,
    options.maxLength && `Target length: ~${options.maxLength} characters`,
  ].filter(Boolean).join('\n')

  if (settings.provider === 'anthropic') {
    return callAnthropic(settings.apiKey, settings.model, prompt)
  }
  return callOpenAI(settings.apiKey, settings.model, prompt)
}

export async function improvePost(text: string, instruction: string): Promise<string> {
  const settings = getAiSettings()
  if (!settings) throw new Error('AI not configured. Add your API key in Settings.')

  const prompt = `Here's a Telegram post:\n\n${text}\n\nInstruction: ${instruction}\n\nReturn only the improved post text, nothing else.`

  if (settings.provider === 'anthropic') {
    return callAnthropic(settings.apiKey, settings.model, prompt)
  }
  return callOpenAI(settings.apiKey, settings.model, prompt)
}

export interface AutoPilotOptions {
  channelName: string
  channelDescription: string
  tone: string
  postCount: number
  topicPrompt: string
  language: string
}

export async function generateAutoPilotDrafts(options: AutoPilotOptions): Promise<string[]> {
  const settings = getAiSettings()
  if (!settings) throw new Error('AI not configured. Add your API key in Settings.')

  const prompt = `You are an expert Telegram content creator. I need you to generate exactly ${options.postCount} standalone posts for a channel.
  
Channel context: ${options.channelDescription}
Tone of Voice: ${options.tone}
Topic/Focus for these posts: ${options.topicPrompt}
Language: ${options.language}

CRITICAL RULES:
- Return ONLY a raw JSON array of strings. 
- Example format: ["Post 1 text...", "Post 2 text...", "Post 3 text..."]
- NO markdown formatting around the JSON (no \`\`\`json).
- NO extra conversational text.
- Follow the Telegram style: use line breaks, very few emojis, no corporate speak.
- Keep them engaging and ready to publish.`

  let jsonText = ''
  
  if (settings.provider === 'anthropic') {
    jsonText = await callAnthropic(settings.apiKey, settings.model, prompt)
  } else {
    jsonText = await callOpenAI(settings.apiKey, settings.model, prompt)
  }
  
  try {
    // Strip markdown code blocks just in case the LLM disobeys
    jsonText = jsonText.replace(/^```json/m, '').replace(/^```/m, '').trim()
    const parsed = JSON.parse(jsonText)
    if (!Array.isArray(parsed)) throw new Error('LLM did not return an array')
    return parsed
  } catch (err) {
    throw new Error('Failed to parse AI response. Try again.')
  }
}
