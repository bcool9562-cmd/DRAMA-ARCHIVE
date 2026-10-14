import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { usernameToEmail } from '@/lib/auth-utils'

/**
 * POST /api/auth/signup
 * Body: { username: string, password: string }
 *
 * Uses the Supabase Admin client to create a user with email_confirm: true
 * so the account works immediately without any email verification link.
 */
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing username or password.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    const email = usernameToEmail(username)
    const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // ← bypass email verification entirely
      user_metadata: { username: username.toLowerCase().trim() },
    })

    if (error) {
      // Surface friendly messages
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ userId: data.user?.id }, { status: 201 })
  } catch (err) {
    console.error('[signup] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
