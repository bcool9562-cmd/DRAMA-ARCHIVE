import { NextRequest, NextResponse } from 'next/server'
import { getDramaDetail, type Drama } from '@/lib/tmdb'

// Fast in-memory server cache (<15ms second request)
const dramaCache = new Map<number, { data: Drama; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const tmdbId = parseInt(id)
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const cached = dramaCache.get(tmdbId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(JSON.stringify(cached.data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'X-Cache': 'HIT',
      },
    })
  }

  const drama = await getDramaDetail(tmdbId)
  if (!drama) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  dramaCache.set(tmdbId, { data: drama, timestamp: Date.now() })

  return new NextResponse(JSON.stringify(drama), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      'X-Cache': 'MISS',
    },
  })
}
