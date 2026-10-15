import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set('drama_archive_unlocked', '', { maxAge: 0, path: '/' })
  cookieStore.delete('drama_archive_unlocked')
  return NextResponse.json({ success: true, locked: true })
}
