import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a Telegram channel post writer. Write engaging posts for Telegram channels.

Rules:
- Write in the specified language
- NO excessive emojis (max 3-4 per post)
- NO long dashes, use short ones (-) or none
- NO formal/corporate tone unless asked
- Sound like a real person, not AI
- Keep it concise, Telegram posts should be scannable
- Use line breaks for readability
- End with a question or call to action when appropriate
- Max 4096 characters (Telegram limit)
- Do NOT wrap in quotes or add meta-commentary, just the post text`

async function callOpenAI(apiKey: string, prompt: string, system?: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system || SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY not configured')

    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      const { error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      if (error) throw new Error('Unauthorized')
    }

    const body = await req.json()
    const { action } = body

    // === Generate single post ===
    if (action === 'generate') {
      const prompt = [
        `Write a Telegram channel post about: ${body.topic}`,
        body.channelName && `Channel: ${body.channelName}`,
        `Tone: ${body.tone || 'casual'}`,
        `Language: ${body.language || 'Ukrainian'}`,
        body.maxLength && `Target length: ~${body.maxLength} characters`,
      ].filter(Boolean).join('\n')

      const text = await callOpenAI(OPENAI_KEY, prompt)
      return new Response(JSON.stringify({ ok: true, text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === Improve existing post ===
    if (action === 'improve') {
      const prompt = `Here's a Telegram post:\n\n${body.text}\n\nInstruction: ${body.instruction}\n\nReturn only the improved post text, nothing else.`
      const text = await callOpenAI(OPENAI_KEY, prompt)
      return new Response(JSON.stringify({ ok: true, text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === Auto-Pilot: generate batch ===
    if (action === 'autopilot') {
      const prompt = `You are an expert Telegram content creator. Generate exactly ${body.postCount} standalone posts.

Channel context: ${body.channelDescription}
Tone of Voice: ${body.tone}
Topic/Focus: ${body.topicPrompt}
Language: ${body.language}

CRITICAL: Return ONLY a raw JSON array of strings. No markdown, no commentary.
Example: ["Post 1...", "Post 2...", "Post 3..."]
Follow Telegram style: line breaks, few emojis, no corporate speak.`

      let jsonText = await callOpenAI(OPENAI_KEY, prompt)
      jsonText = jsonText.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim()
      // Fix common LLM JSON mistakes
      jsonText = jsonText.replace(/,\s*]/g, ']')  // trailing comma
      jsonText = jsonText.replace(/,\s*}/g, '}')  // trailing comma in objects
      // Extract array if wrapped in object like {"posts": [...]}
      let posts
      try {
        const parsed = JSON.parse(jsonText)
        posts = Array.isArray(parsed) ? parsed : (parsed.posts || parsed.results || Object.values(parsed)[0])
      } catch {
        // Try to extract array from text
        const match = jsonText.match(/\[[\s\S]*\]/)
        if (!match) throw new Error('AI не повернув масив постів. Спробуйте ще раз.')
        posts = JSON.parse(match[0].replace(/,\s*]/g, ']'))
      }
      if (!Array.isArray(posts)) throw new Error('AI did not return an array')

      return new Response(JSON.stringify({ ok: true, posts }), {
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
