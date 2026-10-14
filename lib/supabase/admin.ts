import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase Admin client (uses SUPABASE_SECRET_KEY).
 * NEVER expose this to the browser.
 * Used exclusively in Server Actions and Route Handlers.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
