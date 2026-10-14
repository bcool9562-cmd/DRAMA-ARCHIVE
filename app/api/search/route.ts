import { NextRequest, NextResponse } from 'next/server'
import { searchDramas } from '@/lib/tmdb'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  console.log('[api/search] Received search query:', q)
  if (!q.trim()) return NextResponse.json([])
  const results = await searchDramas(q)
  console.log('[api/search] searchDramas returned count:', results.length)
  return NextResponse.json(results)
}
