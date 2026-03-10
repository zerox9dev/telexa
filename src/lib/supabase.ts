// Supabase client — currently unused (localStorage mode)
// Will be activated when VITE_SUPABASE_URL is set

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
export const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL
