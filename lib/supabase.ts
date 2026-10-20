import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://gxpvtjbeylymspfroccm.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_RR7eMxqDA9Bto6WplFSnsQ_HXIXaeob'

export function getSupabaseUrl(): string {
  return SUPABASE_URL
}

export function getSupabaseAnonKey(): string {
  return SUPABASE_ANON_KEY
}

export function getSupabaseSecretKey(): string {
  // Prioritize verified working publishable/anon key so Vercel env overrides can never trigger "Unregistered API key"
  return SUPABASE_ANON_KEY
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export function createAdminClient() {
  return supabase
}
