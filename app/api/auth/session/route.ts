import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const unlocked = cookieStore.get('drama_archive_unlocked')?.value === 'true'
  return NextResponse.json({ unlocked, name: 'Subho !!' })
}
