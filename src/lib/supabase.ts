// Supabase client — currently unused (localStorage mode)
// Will be activated when VITE_SUPABASE_URL is set

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

// Fallback to any to avoid strict TS type errors from manual types
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey)
export const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL
