import { NextRequest, NextResponse } from 'next/server'
import { getPersonDetail } from '@/lib/tmdb'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const personId = parseInt(id)
  if (isNaN(personId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const person = await getPersonDetail(personId)
  if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(person)
}
