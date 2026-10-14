import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { passcode } = await req.json()
    const validPasscode = process.env.ARCHIVE_SECRET_PASSCODE || '@MyPrivate'

    if (passcode === validPasscode) {
      const cookieStore = await cookies()
      cookieStore.set('drama_archive_unlocked', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60, // 1 year persistence
        path: '/',
      })
      return NextResponse.json({ success: true, name: 'Subho !!' })
    }

    return NextResponse.json({ error: 'Incorrect passcode. Try again.' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
