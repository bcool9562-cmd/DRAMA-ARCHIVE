import { NextRequest, NextResponse } from 'next/server'
import { tmdbFetch, type Drama } from '@/lib/tmdb'

export const dynamic = 'force-dynamic'

// Server-side in-memory cache (1 hour TTL per region)
const cache = new Map<string, { data: DiscoverResponse; ts: number }>()
const TTL = 60 * 60 * 1000 // 1 hour

export interface DiscoverRow {
  id: string
  title: string
  dramas: Drama[]
}

export interface DiscoverResponse {
  hero: Drama[]
  rows: DiscoverRow[]
}

const REGION_LANG_MAP: Record<string, { languages: string[]; countries: string[] }> = {
  KR: { languages: ['ko'], countries: ['KR'] },
  CN: { languages: ['zh', 'cn'], countries: ['CN', 'TW', 'HK'] },
  JP: { languages: ['ja'], countries: ['JP'] },
  TW: { languages: ['zh'], countries: ['TW'] },
  TH: { languages: ['th'], countries: ['TH'] },
}

async function fetchTmdb<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  const isVercel = Boolean(process.env.VERCEL)
  if (isVercel) {
    const key = process.env.TMDB_API_KEY?.trim() || '33df8df6b794c2985e67f01fa46775c3'
    const url = new URL(`https://api.themoviedb.org/3${endpoint}`)
    url.searchParams.set('api_key', key)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    try {
      const r = await fetch(url.toString(), { next: { revalidate: 3600 } })
      if (r.ok) return (await r.json()) as T
    } catch {
      // fall back to tmdbFetch
    }
  }
  return tmdbFetch<T>(endpoint, params)
}

function mapTmdbSearchResult(r: any): Drama {
  const dateStr = r.first_air_date || r.release_date || ''
  const country = r.origin_country?.[0] || (
    r.original_language === 'ko' ? 'KR' :
    r.original_language === 'ja' ? 'JP' :
    (r.original_language === 'zh' || r.original_language === 'cn') ? 'CN' :
    r.original_language === 'th' ? 'TH' : 'KR'
  )
  const title = r.name || r.title || ''
  const nativeTitle = (r.original_name && r.original_name !== title ? r.original_name : '') ||
    (r.original_title && r.original_title !== title ? r.original_title : '')
  const posterUrl = r.poster_path ? `https://image.tmdb.org/t/p/original${r.poster_path}` : ''
  const backdropUrl = r.backdrop_path ? `https://image.tmdb.org/t/p/original${r.backdrop_path}` : ''
  return {
    tmdbId: r.id,
    dramaId: `tmdb-${r.id}`,
    title,
    nativeTitle,
    posterUrl,
    backdropUrl,
    country,
    releaseYear: dateStr ? parseInt(dateStr.slice(0, 4)) : 0,
    totalEpisodes: r.number_of_episodes || 0,
    rating: Math.round((r.vote_average || 0) * 10) / 10,
    synopsis: r.overview || '',
    airingStatus: (r.status === 'Returning Series' || r.in_production) ? 'ongoing' : 'completed',
    firstAirDate: dateStr,
    lastAirDate: '',
    nextEpisodeDate: null,
    nextEpisodeNumber: null,
    runtime: null,
    network: r.networks?.[0]?.name || '',
    genres: [],
    tags: [],
  }
}

async function buildDiscover(region: string): Promise<DiscoverResponse> {
  const EA_LANGS = ['ko', 'zh', 'cn', 'ja', 'th']
  const EA_COUNTRIES = ['KR', 'CN', 'JP', 'TW', 'HK', 'TH']

  // Fetch trending (all EA) + popular by region concurrently
  const fetches: Promise<any>[] = [
    fetchTmdb<{ results: any[] }>('/trending/tv/week', { language: 'en-US' }),
  ]

  // Per-region popular rows
  const rowDefs = [
    { id: 'kr', title: 'Popular K-Dramas', lang: 'ko', country: 'KR' },
    { id: 'cn', title: 'Popular C-Dramas', lang: 'zh', country: 'CN' },
    { id: 'jp', title: 'Popular J-Dramas', lang: 'ja', country: 'JP' },
    { id: 'top', title: 'Top Rated & Acclaimed', lang: '', country: '' },
  ]

  for (const row of rowDefs) {
    const params: Record<string, string> = {
      language: 'en-US',
      sort_by: row.id === 'top' ? 'vote_average.desc' : 'popularity.desc',
      'vote_count.gte': '50',
      include_adult: 'false',
      include_null_first_air_dates: 'false',
    }
    if (row.lang) params['with_original_language'] = row.lang
    if (row.country) params['with_origin_country'] = row.country
    fetches.push(fetchTmdb<{ results: any[] }>('/discover/tv', params))
  }

  // If specific region filter (and not ALL), also fetch region-specific trending
  const regionInfo = REGION_LANG_MAP[region]
  if (regionInfo) {
    fetches.push(fetchTmdb<{ results: any[] }>('/discover/tv', {
      language: 'en-US',
      sort_by: 'popularity.desc',
      with_original_language: regionInfo.languages[0],
      with_origin_country: regionInfo.countries[0],
      include_adult: 'false',
    }))
  }

  const results = await Promise.all(fetches)
  const trendingRaw = results[0]?.results || []

  // Filter trending to East Asian only
  const trendingEA = trendingRaw
    .filter((r: any) => {
      const cMatch = Array.isArray(r.origin_country) && r.origin_country.some((c: string) => EA_COUNTRIES.includes(c?.toUpperCase()))
      const lMatch = EA_LANGS.includes(r.original_language)
      return cMatch || lMatch
    })
    .map(mapTmdbSearchResult)

  const hero = trendingEA.slice(0, 5)

  // Build rows
  const rows: DiscoverRow[] = [
    { id: 'trending', title: 'Trending This Week', dramas: trendingEA.slice(0, 20) },
  ]

  for (let i = 0; i < rowDefs.length; i++) {
    const rawList = results[i + 1]?.results || []
    const mapped = rawList
      .filter((r: any) => {
        if (rowDefs[i].id === 'top') {
          const cMatch = Array.isArray(r.origin_country) && r.origin_country.some((c: string) => EA_COUNTRIES.includes(c?.toUpperCase()))
          const lMatch = EA_LANGS.includes(r.original_language)
          return cMatch || lMatch
        }
        return true
      })
      .map(mapTmdbSearchResult)
    if (mapped.length > 0) {
      rows.push({ id: rowDefs[i].id, title: rowDefs[i].title, dramas: mapped.slice(0, 20) })
    }
  }

  return { hero, rows }
}

export async function GET(req: NextRequest) {
  const region = (req.nextUrl.searchParams.get('region') || 'ALL').toUpperCase()
  const cached = cache.get(region)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Cache': 'HIT',
      },
    })
  }

  try {
    const data = await buildDiscover(region)
    cache.set(region, { data, ts: Date.now() })
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Cache': 'MISS',
      },
    })
  } catch (e) {
    console.error('Discover API error:', e)
    return NextResponse.json({ hero: [], rows: [] }, { status: 500 })
  }
}
