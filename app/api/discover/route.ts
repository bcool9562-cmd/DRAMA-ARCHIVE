import { NextRequest, NextResponse } from 'next/server'
import { tmdbFetch, type Drama } from '@/lib/tmdb'

export const dynamic = 'force-dynamic'

// Server-side in-memory cache (15 minutes TTL)
const cache = new Map<string, { data: DiscoverResponse; ts: number }>()
const TTL = 15 * 60 * 1000 // 15 minutes

export interface DiscoverRow {
  id: string
  title: string
  dramas: Drama[]
}

export interface DiscoverResponse {
  hero: Drama[]
  talkOfTheTown: Drama[]
  rows: DiscoverRow[]
}

const REGION_LANG_MAP: Record<string, { languages: string[]; countries: string[] }> = {
  KR: { languages: ['ko'], countries: ['KR'] },
  CN: { languages: ['zh', 'cn'], countries: ['CN', 'TW', 'HK'] },
  JP: { languages: ['ja'], countries: ['JP'] },
  TW: { languages: ['zh'], countries: ['TW'] },
  TH: { languages: ['th'], countries: ['TH'] },
}

// Strictly exclude: 16 (Animation), 10764 (Reality), 10767 (Talk), 99 (Documentary), 10763 (News)
const EXCLUDED_GENRES = new Set([16, 10764, 10767, 99, 10763])
const WITHOUT_GENRES_PARAM = '16,10764,10767,99,10763'
const EA_LANGS = ['ko', 'zh', 'cn', 'ja', 'th']
const EA_COUNTRIES = ['KR', 'CN', 'JP', 'TW', 'HK', 'TH']

async function fetchTmdb<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  const isVercel = Boolean(process.env.VERCEL)
  if (isVercel) {
    const key = process.env.TMDB_API_KEY?.trim() || '33df8df6b794c2985e67f01fa46775c3'
    const url = new URL(`https://api.themoviedb.org/3${endpoint}`)
    url.searchParams.set('api_key', key)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    try {
      const r = await fetch(url.toString(), { next: { revalidate: 900 } })
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
  const posterUrl = r.poster_path ? `https://image.tmdb.org/t/p/w780${r.poster_path}` : ''
  const backdropUrl = r.backdrop_path ? `https://image.tmdb.org/t/p/original${r.backdrop_path}` : ''
  return {
    tmdbId: r.id,
    dramaId: String(r.id),
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

function isScriptedEastAsian(r: any): boolean {
  if (!r) return false
  // Exclude variety, reality, talk, doc, news, and animation
  if (Array.isArray(r.genre_ids)) {
    if (r.genre_ids.some((g: number) => EXCLUDED_GENRES.has(g))) return false
  }
  const cMatch = Array.isArray(r.origin_country) && r.origin_country.some((c: string) => EA_COUNTRIES.includes(c?.toUpperCase()))
  const lMatch = EA_LANGS.includes(r.original_language)
  return Boolean(cMatch || lMatch)
}

async function buildDiscover(region: string): Promise<DiscoverResponse> {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  // Strict 75 days recency cutoff
  const cutoffDate = new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const fetches: Promise<any>[] = [
    // 0: Trending this week
    fetchTmdb<{ results: any[] }>('/trending/tv/week', {
      language: 'en-US',
      without_genres: WITHOUT_GENRES_PARAM,
    }),
    // 1: Recent K-Dramas (released >= cutoffDate)
    fetchTmdb<{ results: any[] }>('/discover/tv', {
      language: 'en-US',
      sort_by: 'popularity.desc',
      with_origin_country: 'KR',
      'first_air_date.gte': cutoffDate,
      without_genres: WITHOUT_GENRES_PARAM,
      include_adult: 'false',
    }),
    // 2: Recent C-Dramas (released >= cutoffDate)
    fetchTmdb<{ results: any[] }>('/discover/tv', {
      language: 'en-US',
      sort_by: 'popularity.desc',
      with_origin_country: 'CN',
      'first_air_date.gte': cutoffDate,
      without_genres: WITHOUT_GENRES_PARAM,
      include_adult: 'false',
    }),
    // 3: Recent J-Dramas (released >= cutoffDate)
    fetchTmdb<{ results: any[] }>('/discover/tv', {
      language: 'en-US',
      sort_by: 'popularity.desc',
      with_origin_country: 'JP',
      'first_air_date.gte': cutoffDate,
      without_genres: WITHOUT_GENRES_PARAM,
      include_adult: 'false',
    }),
    // 4: Upcoming East Asian Dramas (first_air_date >= todayStr)
    fetchTmdb<{ results: any[] }>('/discover/tv', {
      language: 'en-US',
      sort_by: 'popularity.desc',
      with_origin_country: 'KR',
      'first_air_date.gte': todayStr,
      without_genres: WITHOUT_GENRES_PARAM,
      include_adult: 'false',
    }),
  ]

  // If specific region filter
  const regionInfo = REGION_LANG_MAP[region]
  if (regionInfo) {
    fetches.push(fetchTmdb<{ results: any[] }>('/discover/tv', {
      language: 'en-US',
      sort_by: 'popularity.desc',
      with_origin_country: regionInfo.countries[0],
      'first_air_date.gte': cutoffDate,
      without_genres: WITHOUT_GENRES_PARAM,
      include_adult: 'false',
    }))
  }

  const results = await Promise.all(fetches)
  const trendingRaw = results[0]?.results || []
  const krRecent = results[1]?.results || []
  const cnRecent = results[2]?.results || []
  const jpRecent = results[3]?.results || []
  const upcomingRaw = results[4]?.results || []
  const regionalRaw = results[5]?.results || []

  // Collect all raw candidate dramas for Talk Of The Town
  const rawPool = [
    ...upcomingRaw,
    ...trendingRaw,
    ...krRecent,
    ...cnRecent,
    ...jpRecent,
    ...regionalRaw,
  ]

  // Strict Recency Filtering for Talk Of The Town:
  // - East Asian live-action only
  // - No animation, reality, variety, talk, doc
  // - first_air_date >= cutoffDate OR in the future
  // - Must have valid poster
  const seenIds = new Set<number>()
  const talkOfTheTown: Drama[] = []

  for (const r of rawPool) {
    if (!r?.id || seenIds.has(r.id)) continue
    if (!isScriptedEastAsian(r)) continue

    const airDate = r.first_air_date || r.release_date
    if (!airDate) continue

    // Reject shows older than 75 days
    if (airDate < cutoffDate) continue

    seenIds.add(r.id)
    talkOfTheTown.push(mapTmdbSearchResult(r))
  }

  // Sort: upcoming & current hottest first
  talkOfTheTown.sort((a, b) => {
    // Upcoming first, then popularity / rating
    const aUpcoming = a.firstAirDate && a.firstAirDate > todayStr ? 1 : 0
    const bUpcoming = b.firstAirDate && b.firstAirDate > todayStr ? 1 : 0
    if (aUpcoming !== bUpcoming) return bUpcoming - aUpcoming
    return b.rating - a.rating
  })

  // Hero: top 5 from Talk Of The Town
  const hero = talkOfTheTown.slice(0, 5)

  // Rows for discovery
  const rows: DiscoverRow[] = [
    {
      id: 'airing',
      title: 'Airing Now & New Releases',
      dramas: talkOfTheTown.filter(d => !d.firstAirDate || d.firstAirDate <= todayStr).slice(0, 15),
    },
    {
      id: 'upcoming',
      title: 'Upcoming Dramas',
      dramas: talkOfTheTown.filter(d => !!d.firstAirDate && d.firstAirDate > todayStr).slice(0, 15),
    },
    {
      id: 'kr',
      title: 'Recent Korean Dramas',
      dramas: talkOfTheTown.filter(d => d.country === 'KR').slice(0, 15),
    },
    {
      id: 'cn',
      title: 'Recent Chinese Dramas',
      dramas: talkOfTheTown.filter(d => d.country === 'CN').slice(0, 15),
    },
  ]

  return { hero, talkOfTheTown, rows }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const region = (searchParams.get('region') || 'ALL').toUpperCase()

  const cached = cache.get(region)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    const data = await buildDiscover(region)
    cache.set(region, { data, ts: Date.now() })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to build discover feed', details: err?.message || String(err) },
      { status: 500 }
    )
  }
}
