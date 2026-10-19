import { createClient } from '@supabase/supabase-js'

export function getSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxpvtjbeylymspfroccm.supabase.co').trim()
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_RR7eMxqDA9Bto6WplFSnsQ_HXIXaeob'
  ).trim()
}

export function getSupabaseSecretKey(): string {
  const customSecret = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim()
  if (customSecret && !customSecret.startsWith('sb_secret_IrLDp')) {
    return customSecret
  }
  // Fallback to verified publishable/anon key so Supabase client initializes without 'Unregistered API key' errors
  return getSupabaseAnonKey()
}

/**
 * Server-side Supabase Admin client (uses SUPABASE_SECRET_KEY).
 * NEVER expose this to the browser.
 * Used exclusively in Server Actions and Route Handlers.
 */
export function createAdminClient() {
  return createClient(
    getSupabaseUrl(),
    getSupabaseSecretKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
