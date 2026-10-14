import { NextRequest, NextResponse } from 'next/server'
import { getDramaDetail } from '@/lib/tmdb'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const tmdbId = parseInt(id)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const drama = await getDramaDetail(tmdbId)
  if (!drama) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(drama)
}
