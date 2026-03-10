import { supabase, isSupabaseConfigured } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const AI_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/ai` : ''

async function callAiFunction(body: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured) throw new Error('AI доступний тільки в онлайн-режимі')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Увійдіть в акаунт')

  const res = await fetch(AI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'AI помилка')
  return data
}

interface GenerateOptions {
  topic: string
  channelName?: string
  tone?: 'casual' | 'professional' | 'educational' | 'provocative'
  language?: string
  maxLength?: number
}

export async function generatePost(options: GenerateOptions): Promise<string> {
  const data = await callAiFunction({ action: 'generate', ...options })
  return data.text
}

export async function improvePost(text: string, instruction: string): Promise<string> {
  const data = await callAiFunction({ action: 'improve', text, instruction })
  return data.text
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
  const data = await callAiFunction({ action: 'autopilot', ...options })
  return data.posts
}

export interface ChannelAnalysis {
  description: string
  audience: string
  tone: string
  topics: string[]
  language: string
  rules: string
  example_posts: string[]
}

export async function analyzeChannel(username: string): Promise<{ profile: ChannelAnalysis; postCount: number }> {
  const data = await callAiFunction({ action: 'analyze', username })
  return { profile: data.profile, postCount: data.postCount }
}
