import { NextRequest, NextResponse } from 'next/server'
import { getPersonDetail, type TmdbPerson } from '@/lib/tmdb'

// Fast in-memory server cache (<15ms second request)
const personCache = new Map<number, { data: TmdbPerson; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const personId = parseInt(id)
  if (isNaN(personId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const cached = personCache.get(personId)
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

  const person = await getPersonDetail(personId)
  if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  personCache.set(personId, { data: person, timestamp: Date.now() })

  return new NextResponse(JSON.stringify(person), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      'X-Cache': 'MISS',
    },
  })
}
