import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDramaDetail, getDramaSeason, type TmdbSeasonEpisode } from '@/lib/tmdb'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FIXED_USER_ID = '00000000-0000-0000-0000-000000000001'
const TABLE = 'user_dramas_v2'

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'user_dramas.json')
const TMP_FILE = path.join('/tmp', 'user_dramas.json')

function readLocalArchive(): any[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8')
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  try {
    if (fs.existsSync(TMP_FILE)) {
      const content = fs.readFileSync(TMP_FILE, 'utf-8')
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

// Current date in Asia/Seoul (UTC+9) in YYYY-MM-DD
function getSeoulTodayStr(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(new Date()) // 'YYYY-MM-DD'
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function diffInDays(targetDateStr: string, baseDateStr: string): number {
  const t = new Date(targetDateStr + 'T00:00:00Z').getTime()
  const b = new Date(baseDateStr + 'T00:00:00Z').getTime()
  return Math.round((t - b) / (1000 * 60 * 60 * 24))
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Process watching and watchlist dramas to compute real upcoming airings
async function computeAiringAlerts(rawDramas: any[]) {
  const todayStr = getSeoulTodayStr()

  // STRICT RULE: ONLY Watching and Watchlist dramas. NEVER Finished or unlisted dramas!
  const watchingDramas = rawDramas.filter((d) => d && d.status === 'watching')
  const watchlistDramas = rawDramas.filter((d) => d && d.status === 'watchlist')

  if (watchingDramas.length === 0 && watchlistDramas.length === 0) {
    return []
  }

  const newEpisodes: any[] = []
  const upcomingPremieres: any[] = []

  // 1. Process Watching Dramas concurrently (Ongoing Next Episodes)
  const watchingResults = await Promise.all(
    watchingDramas.map(async (drama) => {
      const tmdbId = Number(drama.tmdb_id)
      let nextDate: string | null = drama.next_episode_date
        ? String(drama.next_episode_date).trim()
        : null
      let nextEpNum: number =
        Number(drama.next_episode_number || drama.watched_episodes) || 1
      let fetchedPosterUrl: string | null = null

      if (tmdbId) {
        try {
          const detail = await getDramaDetail(tmdbId)
          if (detail) {
            fetchedPosterUrl = detail.posterUrl || null
            if (detail.nextEpisodeDate && detail.nextEpisodeDate >= todayStr) {
              nextDate = detail.nextEpisodeDate
              nextEpNum = detail.nextEpisodeNumber || nextEpNum
            } else {
              // Fetch full season episodes to inspect actual schedule
              const season = await getDramaSeason(tmdbId, 1)
              if (season && season.episodes && season.episodes.length > 0) {
                const upcoming = season.episodes.find(
                  (e: TmdbSeasonEpisode) => e.air_date && e.air_date >= todayStr
                )
                if (upcoming && upcoming.air_date) {
                  nextDate = upcoming.air_date
                  nextEpNum = upcoming.episode_number
                } else {
                  // Fallback for currently airing shows where TMDB only dated past episodes
                  const pastEpisodes = season.episodes
                    .filter(
                      (e: TmdbSeasonEpisode) => !!e.air_date && e.air_date < todayStr
                    )
                    .sort((a, b) =>
                      (a.air_date || '').localeCompare(b.air_date || '')
                    )

                  const lastDated = pastEpisodes[pastEpisodes.length - 1]
                  if (lastDated && lastDated.air_date) {
                    const daysSinceLast = diffInDays(todayStr, lastDated.air_date)
                    if (daysSinceLast >= 1 && daysSinceLast <= 6) {
                      nextDate = addDays(lastDated.air_date, 7)
                      nextEpNum = Math.min(
                        drama.total_episodes || detail.totalEpisodes || 99,
                        lastDated.episode_number + 2
                      )
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error(`[airing] TMDB fetch error for drama ${tmdbId}:`, err)
        }
      }

      // If stored nextDate was in the past 1-6 days and still hasn't advanced, project next week
      if (nextDate && nextDate < todayStr) {
        const daysAgo = diffInDays(todayStr, nextDate)
        if (daysAgo >= 1 && daysAgo <= 6) {
          nextDate = addDays(nextDate, 7)
          nextEpNum = Math.min(drama.total_episodes || 99, nextEpNum + 2)
        }
      }

      // Crucial: Next Episodes must NEVER display past dates
      if (nextDate && nextDate >= todayStr) {
        return {
          ...drama,
          status: 'watching',
          poster_url: drama.poster_url || drama.poster || fetchedPosterUrl || null,
          next_episode_date: nextDate,
          next_episode_number: nextEpNum,
        }
      }
      return null
    })
  )

  for (const item of watchingResults) {
    if (item) newEpisodes.push(item)
  }

  // 2. Process Watchlist Dramas (Upcoming Premieres)
  for (const drama of watchlistDramas) {
    let airDate = drama.first_air_date ? String(drama.first_air_date).trim() : null
    let fetchedPoster = drama.poster_url || drama.poster || null

    // If first_air_date is missing or in the past, verify with TMDB
    const tmdbIdNum = Number(drama.tmdb_id)
    if ((!airDate || airDate < todayStr) && tmdbIdNum) {
      try {
        const detail = await getDramaDetail(tmdbIdNum)
        if (detail && detail.firstAirDate) {
          airDate = detail.firstAirDate
          fetchedPoster = fetchedPoster || detail.posterUrl
        }
      } catch {}
    }

    // Only include if premiere is today or in the future
    if (airDate && airDate >= todayStr) {
      upcomingPremieres.push({
        ...drama,
        status: 'watchlist',
        poster_url: fetchedPoster,
        first_air_date: airDate,
      })
    }
  }

  return [...newEpisodes, ...upcomingPremieres]
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()

    // 1. Fetch user's saved dramas from database table
    let rawDramas: any[] = []
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', FIXED_USER_ID)
      if (!error && Array.isArray(data)) {
        rawDramas = data
      }
    } catch {}

    // 2. Fall back to local archive if database was empty or errored
    if (rawDramas.length === 0) {
      rawDramas = readLocalArchive()
    }

    const alerts = await computeAiringAlerts(rawDramas)

    return new NextResponse(JSON.stringify(alerts), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (err: any) {
    console.error('[api/airing] GET error:', err)
    return NextResponse.json([], { status: 200 })
  }
}

// POST endpoint: Allows the client to send current watchlist & watching dramas for real-time calculation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const clientDramas = Array.isArray(body?.dramas) ? body.dramas : []
    const alerts = await computeAiringAlerts(clientDramas)

    return new NextResponse(JSON.stringify(alerts), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (err: any) {
    console.error('[api/airing] POST error:', err)
    return NextResponse.json([], { status: 200 })
  }
}
