/**
 * TMDB & MyDramaList API Layer — Drama Archive
 *
 * - Always uses /t/p/original for ultra-HD 4K images.
 * - Always uses ?api_key=${TMDB_API_KEY} as query parameter.
 * - Uses secure Cloudflare/Google DNS resolution to prevent ISP DNS hijacking/poisoning.
 * - Filters East Asian dramas across KR, CN, JP, TW, HK, TH and ko, zh, cn, ja, th.
 * - Merges Kuryana MyDramaList search results with a 2.5s timeout.
 */

import https from 'https'
import dns from 'dns'

// Set DNS servers to Cloudflare & Google to bypass any local ISP DNS blocks/poisoning
const resolver = new dns.Resolver()
try {
  resolver.setServers(['1.1.1.1', '8.8.8.8', '1.0.0.1', '8.8.4.4'])
} catch {
  // Ignore in environments where setServers is restricted
}

const TMDB_STATIC_IPS = ['13.224.245.44', '13.224.245.47', '13.224.245.63', '13.224.245.92', '13.227.173.106']

const TMDB_BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p/original'
const EAST_ASIAN_REGIONS = ['KR', 'CN', 'JP', 'TW', 'HK', 'TH']
const EAST_ASIAN_LANGS = ['ko', 'zh', 'cn', 'ja', 'th']

function getApiKey(): string {
  const key = (process.env.TMDB_API_KEY || '33df8df6b794c2985e67f01fa46775c3').trim()
  return key
}

import { tmdbImg, tmdbThumb, tmdbCard, tmdbOriginal, resolveImageUrl, getProxyImageUrl } from './image-utils'
export { tmdbImg, tmdbThumb, tmdbCard, tmdbOriginal, resolveImageUrl, getProxyImageUrl }

/**
 * Robust HTTPS fetch for TMDB that resolves directly via Cloudflare/Google DNS
 * to avoid ISP DNS tampering or timeouts. Falls back to system DNS in cloud environments.
 */
export function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      const url = new URL(`${TMDB_BASE}${endpoint}`)
      url.searchParams.set('api_key', getApiKey())
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v)
      }

      const reqOptions: https.RequestOptions = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DramaArchive/1.0 (Windows NT 10.0; Win64; x64)',
        },
        lookup: (hostname: string, opts: any, cb: any) => {
          if (typeof opts === 'function') {
            cb = opts
            opts = {}
          }
          resolver.resolve4(hostname, (err, ips) => {
            const list = (!err && ips && ips.length > 0) ? ips : (hostname.includes('themoviedb.org') ? TMDB_STATIC_IPS : null)
            if (list && list.length > 0) {
              if (opts && opts.all) {
                return cb(null, list.map((ip) => ({ address: ip, family: 4 })))
              }
              return cb(null, list[0], 4)
            }
            dns.lookup(hostname, opts, cb)
          })
        },
      }

      const req = https.request(reqOptions, (res) => {
        let rawData = ''
        res.on('data', (chunk) => { rawData += chunk })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(rawData) as T)
            } catch (parseErr) {
              console.error('[tmdbFetch JSON parse error]:', parseErr)
              resolve(null)
            }
          } else {
            console.error('[tmdbFetch bad status]:', res.statusCode, rawData.slice(0, 200))
            resolve(null)
          }
        })
      })

      req.on('error', (err) => {
        console.error('[tmdbFetch req error]:', err)
        resolve(null)
      })
      req.setTimeout(12000, () => {
        console.error('[tmdbFetch timeout on endpoint]:', endpoint)
        req.destroy()
        resolve(null)
      })
      req.end()
    } catch {
      resolve(null)
    }
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TmdbSearchResult {
  id: number
  name?: string
  title?: string
  original_name?: string
  original_title?: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date?: string
  release_date?: string
  vote_average: number
  origin_country?: string[]
  original_language?: string
  overview: string
  genre_ids?: number[]
  media_type?: string
}

export interface TmdbImage {
  file_path: string
  width: number
  height: number
  vote_average: number
  iso_639_1: string | null
}

export interface TmdbCastMember {
  id: number
  name: string
  original_name: string
  character: string
  profile_path: string | null
  order: number
  known_for_department: string
}

export interface TmdbCrewMember {
  id: number
  name: string
  original_name: string
  job: string
  department: string
  profile_path: string | null
}

export interface TmdbDramaDetail {
  id: number
  name: string
  original_name: string
  tagline: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  last_air_date: string
  next_episode_to_air: { air_date: string; episode_number: number } | null
  number_of_episodes: number
  number_of_seasons: number
  episode_run_time: number[]
  vote_average: number
  vote_count: number
  status: string
  in_production: boolean
  origin_country: string[]
  original_language: string
  genres: { id: number; name: string }[]
  networks: { id: number; name: string; logo_path: string | null }[]
  created_by: { id: number; name: string; profile_path: string | null }[]
  images?: {
    posters: TmdbImage[]
    backdrops: TmdbImage[]
  }
  credits?: {
    cast: TmdbCastMember[]
    crew: TmdbCrewMember[]
  }
  keywords?: { results: { id: number; name: string }[] }
}

export interface TmdbPerson {
  id: number
  name: string
  biography: string
  birthday: string | null
  deathday: string | null
  place_of_birth: string | null
  profile_path: string | null
  known_for_department: string
  combined_credits: {
    cast: TmdbPersonCredit[]
    crew: TmdbPersonCredit[]
  }
}

export type TmdbPersonDetail = TmdbPerson

export interface TmdbPersonCredit {
  id: number
  name?: string
  title?: string
  original_name?: string
  poster_path: string | null
  vote_average: number
  vote_count?: number
  first_air_date?: string
  release_date?: string
  character?: string
  job?: string
  media_type: 'tv' | 'movie'
  origin_country?: string[]
  original_language?: string
}

export interface Drama {
  tmdbId: number
  dramaId: string
  title: string
  nativeTitle: string
  posterUrl: string
  backdropUrl: string
  country: string
  releaseYear: number
  totalEpisodes: number
  rating: number
  synopsis: string
  airingStatus: 'ongoing' | 'completed' | 'upcoming'
  firstAirDate: string
  lastAirDate: string
  nextEpisodeDate: string | null
  nextEpisodeNumber: number | null
  runtime: number | null
  network: string
  genres: string[]
  tags: string[]
  images?: TmdbImage[]
  backdrops?: TmdbImage[]
  cast?: TmdbCastMember[]
  directors?: TmdbCrewMember[]
}

// ─── Filtering Helpers ────────────────────────────────────────────────────────

export function isEastAsian(
  r: {
    id?: number
    name?: string
    title?: string
    poster_path?: string | null
    vote_count?: number
    origin_country?: string[]
    original_language?: string
    genre_ids?: number[]
    overview?: string
  },
  query?: string
): boolean {
  // Exclude unverified stubs with no poster and 0 votes
  if (!r.poster_path && (r.vote_count ?? 0) === 0) return false

  // Strictly exclude Animation / Anime (TMDB genre ID 16)
  if (Array.isArray(r.genre_ids) && r.genre_ids.includes(16)) return false

  // Allow popular crossover series set in Korea/East Asia (e.g. XO, Kitty, Pachinko)
  const title = (r.name || r.title || '').toLowerCase()
  const q = (query || '').toLowerCase().trim()
  if (r.id === 195670 || title.includes('xo, kitty')) return true
  if (q && q.includes('xo, kitty') && title.includes('kitty')) return true

  const countryMatch =
    Array.isArray(r.origin_country) &&
    r.origin_country.some((c) => EAST_ASIAN_REGIONS.includes(c?.toUpperCase()))

  const langMatch =
    !!r.original_language &&
    EAST_ASIAN_LANGS.includes(r.original_language.toLowerCase())

  const overview = (r.overview || '').toLowerCase()
  const kDramaContext =
    overview.includes('korean') ||
    overview.includes('seoul') ||
    overview.includes('k-drama') ||
    overview.includes('kdrama')

  return countryMatch || langMatch || kDramaContext
}

function mapAiringStatus(s: TmdbDramaDetail): Drama['airingStatus'] {
  if (s.status === 'In Production' || s.status === 'Planned') return 'upcoming'
  if (s.in_production || s.status === 'Returning Series') return 'ongoing'
  return 'completed'
}

function mapTmdbDetail(d: TmdbDramaDetail): Drama {
  const year = d.first_air_date ? parseInt(d.first_air_date.slice(0, 4)) : 0
  let country =
    d.origin_country?.[0] ||
    (d.original_language === 'ko'
      ? 'KR'
      : d.original_language === 'ja'
      ? 'JP'
      : d.original_language === 'zh' || d.original_language === 'cn'
      ? 'CN'
      : d.original_language === 'th'
      ? 'TH'
      : '')

  if (d.id === 195670 || d.name?.toLowerCase().includes('xo, kitty')) {
    country = 'KR'
  }

  return {
    tmdbId: d.id,
    dramaId: `tmdb-${d.id}`,
    title: d.name,
    nativeTitle: d.original_name && d.original_name !== d.name ? d.original_name : '',
    posterUrl: tmdbImg(d.poster_path),
    backdropUrl: tmdbImg(d.backdrop_path),
    country,
    releaseYear: year,
    totalEpisodes: d.number_of_episodes ?? 0,
    rating: Math.round((d.vote_average || 0) * 10) / 10,
    synopsis: d.overview || '',
    airingStatus: mapAiringStatus(d),
    firstAirDate: d.first_air_date ?? '',
    lastAirDate: d.last_air_date ?? '',
    nextEpisodeDate: d.next_episode_to_air?.air_date ?? null,
    nextEpisodeNumber: d.next_episode_to_air?.episode_number ?? null,
    runtime: d.episode_run_time?.[0] ?? null,
    network: d.networks?.[0]?.name ?? '',
    genres: d.genres?.map((g) => g.name) ?? [],
    tags: d.keywords?.results?.map((k) => k.name) ?? [],
    images: [...(d.images?.posters ?? [])].sort((a, b) => {
      const aEA = EAST_ASIAN_LANGS.includes(a.iso_639_1 ?? '') ? -1 : 0
      const bEA = EAST_ASIAN_LANGS.includes(b.iso_639_1 ?? '') ? -1 : 0
      return aEA - bEA
    }),
    backdrops: d.images?.backdrops ?? [],
    cast: d.credits?.cast ?? [],
    directors: d.credits?.crew?.filter((c) => c.job === 'Director') ?? [],
  }
}

// ─── Kuryana MyDramaList Search Helper ────────────────────────────────────────

interface KuryanaResult {
  id?: string | number
  title?: string
  name?: string
  native_title?: string
  thumb?: string
  poster?: string
  year?: string | number
  rating?: string | number
  country?: string
  synopsis?: string
}

async function searchKuryana(query: string): Promise<Drama[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1200)

    const res = await fetch(`https://kuryana.tbdh.app/search/q/${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const json = await res.json()
    const results: KuryanaResult[] = json?.results || json?.data || (Array.isArray(json) ? json : [])

    return results
      .filter((r) => !!(r.title || r.name) && !!(r.poster || r.thumb))
      .slice(0, 5)
      .map((r, i) => {
      const idNum = typeof r.id === 'number' ? r.id : parseInt(String(r.id || '').replace(/\D/g, '')) || 900000 + i
      const year = typeof r.year === 'number' ? r.year : parseInt(String(r.year || '0')) || 0
      const rating = typeof r.rating === 'number' ? r.rating : parseFloat(String(r.rating || '0')) || 0

      return {
        tmdbId: idNum,
        dramaId: `mdl-${idNum}`,
        title: r.title || r.name || query,
        nativeTitle: r.native_title || '',
        posterUrl: r.poster || r.thumb || '',
        backdropUrl: '',
        country: r.country || 'KR',
        releaseYear: year,
        totalEpisodes: 0,
        rating,
        synopsis: r.synopsis || '',
        airingStatus: 'completed' as const,
        firstAirDate: year ? `${year}-01-01` : '',
        lastAirDate: '',
        nextEpisodeDate: null,
        nextEpisodeNumber: null,
        runtime: null,
        network: 'MyDramaList',
        genres: [],
        tags: [],
      }
    })
  } catch {
    return []
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Live search for East Asian dramas (TV + Multi + Kuryana MDL).
 */
export async function searchDramas(query: string): Promise<Drama[]> {
  const cleanQ = query.trim()
  if (!cleanQ) return []

  // Fetch TMDB TV, TMDB Multi, and Kuryana concurrently
  const [tvData, multiData, mdlData] = await Promise.all([
    tmdbFetch<{ results: TmdbSearchResult[] }>('/search/tv', {
      query: cleanQ,
      include_adult: 'false',
      language: 'en-US',
    }),
    tmdbFetch<{ results: TmdbSearchResult[] }>('/search/multi', {
      query: cleanQ,
      include_adult: 'false',
      language: 'en-US',
    }),
    searchKuryana(cleanQ),
  ])

  const rawResults: TmdbSearchResult[] = [
    ...(tvData?.results ?? []),
    ...(multiData?.results ?? []),
  ]

  // Filter East Asian entries and deduplicate by ID
  const seenIds = new Set<number>()
  const tmdbDramas: Drama[] = []

  for (const r of rawResults) {
    if (!r.id || seenIds.has(r.id)) continue
    // Filter to East Asian / Crossover
    if (!isEastAsian(r, cleanQ)) continue

    seenIds.add(r.id)

    const title = r.name || r.title || ''
    const nativeTitle =
      (r.original_name && r.original_name !== title ? r.original_name : '') ||
      (r.original_title && r.original_title !== title ? r.original_title : '')

    const dateStr = r.first_air_date || r.release_date || ''
    const releaseYear = dateStr ? parseInt(dateStr.slice(0, 4)) : 0

    let country =
      r.origin_country?.[0] ||
      (r.original_language === 'ko'
        ? 'KR'
        : r.original_language === 'ja'
        ? 'JP'
        : r.original_language === 'zh' || r.original_language === 'cn'
        ? 'CN'
        : r.original_language === 'th'
        ? 'TH'
        : '')

    if (r.id === 195670 || title.toLowerCase().includes('xo, kitty')) {
      country = 'KR'
    }

    const network = (r.id === 195670 || title.toLowerCase().includes('xo, kitty')) ? 'Netflix' : ''

    tmdbDramas.push({
      tmdbId: r.id,
      dramaId: `tmdb-${r.id}`,
      title,
      nativeTitle,
      posterUrl: tmdbImg(r.poster_path),
      backdropUrl: tmdbImg(r.backdrop_path),
      country,
      releaseYear,
      totalEpisodes: 0,
      rating: Math.round((r.vote_average || 0) * 10) / 10,
      synopsis: r.overview || '',
      airingStatus: 'completed',
      firstAirDate: dateStr,
      lastAirDate: '',
      nextEpisodeDate: null,
      nextEpisodeNumber: null,
      runtime: null,
      network,
      genres: [],
      tags: [],
    })
  }

  // Merge MDL results if any exist and are not already in TMDB list
  for (const mdl of mdlData) {
    const exists = tmdbDramas.some(
      (d) => d.title.toLowerCase() === mdl.title.toLowerCase()
    )
    if (!exists) {
      tmdbDramas.push(mdl)
    }
  }

  return tmdbDramas.slice(0, 25)
}

/**
 * Get full drama detail (cast, photos, network, keywords)
 */
export async function getDramaDetail(tmdbId: number): Promise<Drama | null> {
  let data = await tmdbFetch<TmdbDramaDetail>(`/tv/${tmdbId}`, {
    append_to_response: 'credits,images,keywords',
    include_image_language: 'ko,zh,ja,en,null',
    language: 'en-US',
  })

  // If not found as TV, check movie (for web drama movies / TV films)
  if (!data) {
    const movieData = await tmdbFetch<TmdbDramaDetail & { title?: string; original_title?: string; release_date?: string }>(
      `/movie/${tmdbId}`,
      {
        append_to_response: 'credits,images,keywords',
        include_image_language: 'ko,zh,ja,en,null',
        language: 'en-US',
      }
    )
    if (movieData) {
      data = {
        ...movieData,
        name: movieData.title || movieData.name,
        original_name: movieData.original_title || movieData.original_name,
        first_air_date: movieData.release_date || movieData.first_air_date,
        number_of_episodes: 1,
        number_of_seasons: 1,
      }
    }
  }

  if (!data) return null
  return mapTmdbDetail(data)
}

/**
 * Get person detail + East Asian credits
 */
export async function getPersonDetail(personId: number): Promise<TmdbPerson | null> {
  const data = await tmdbFetch<TmdbPerson>(`/person/${personId}`, {
    append_to_response: 'combined_credits',
    language: 'en-US',
  })
  if (!data) return null

  return {
    ...data,
    profile_path: tmdbImg(data.profile_path),
    combined_credits: {
      cast: (data.combined_credits?.cast ?? [])
        .filter((c) => isEastAsian(c))
        .sort((a, b) => (b.first_air_date ?? b.release_date ?? '').localeCompare(a.first_air_date ?? a.release_date ?? ''))
        .map((c) => ({ ...c, poster_path: tmdbImg(c.poster_path) })),
      crew: (data.combined_credits?.crew ?? [])
        .filter((c) => isEastAsian(c) && (c.job === 'Director' || c.job === 'Producer'))
        .sort((a, b) => (b.first_air_date ?? b.release_date ?? '').localeCompare(a.first_air_date ?? a.release_date ?? ''))
        .map((c) => ({ ...c, poster_path: tmdbImg(c.poster_path) })),
    },
  }
}

export interface TmdbSeasonEpisode {
  air_date: string | null
  episode_number: number
  id: number
  name: string
  overview: string
  season_number: number
  still_path: string | null
  vote_average: number
}

export interface TmdbSeasonDetail {
  _id: string
  air_date: string
  episodes: TmdbSeasonEpisode[]
  name: string
  overview: string
  id: number
  poster_path: string | null
  season_number: number
}

/**
 * Get full season episode listing
 */
export async function getDramaSeason(tmdbId: number, seasonNumber: number = 1): Promise<TmdbSeasonDetail | null> {
  return await tmdbFetch<TmdbSeasonDetail>(`/tv/${tmdbId}/season/${seasonNumber}`, {
    language: 'en-US',
  })
}

