import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDramaDetail, getDramaSeason, type TmdbSeasonEpisode } from '@/lib/tmdb'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FIXED_USER_ID = '00000000-0000-0000-0000-000000000001'
const TABLE = 'user_dramas_v2'
const STORAGE_BUCKET = 'drama_archive'
const STORAGE_FILE = 'user_dramas.json'

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'user_dramas.json')

function readLocalArchive(): any[] {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (!fs.existsSync(DATA_FILE)) return []
    const content = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(content) || []
  } catch {
    return []
  }
}

async function readFromStorage(supabase: ReturnType<typeof createAdminClient>): Promise<any[]> {
  try {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(STORAGE_FILE)
    if (!error && data) {
      const text = await data.text()
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.error('[airing storage read error]:', e)
  }
  return readLocalArchive()
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

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const todayStr = getSeoulTodayStr()

    // 1. Fetch user's saved dramas
    let rawDramas: any[] = []
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', FIXED_USER_ID)
      if (!error && data && data.length > 0) {
        rawDramas = data
      }
    } catch {
      // Table query failed, fall through to storage
    }

    if (rawDramas.length === 0) {
      rawDramas = await readFromStorage(supabase)
    }

    const watchingDramas = rawDramas.filter(d => d.status === 'watching')
    const watchlistDramas = rawDramas.filter(d => d.status === 'watchlist')

    const newEpisodes: any[] = []
    const upcomingPremieres: any[] = []

    // 2. Process Watching Dramas concurrently (Ongoing Next Episodes)
    const watchingResults = await Promise.all(
      watchingDramas.map(async (drama) => {
        const tmdbId = Number(drama.tmdb_id)
        let nextDate: string | null = drama.next_episode_date ? String(drama.next_episode_date).trim() : null
        let nextEpNum: number = Number(drama.next_episode_number || drama.watched_episodes) || 1
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
                      .filter((e: TmdbSeasonEpisode) => !!e.air_date && e.air_date < todayStr)
                      .sort((a, b) => (a.air_date || '').localeCompare(b.air_date || ''))

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

        // Crucial: Next Episodes must NEVER display past dates (Xd Ago)
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

    // Known verified poster fallbacks for dramas
    const KNOWN_POSTERS: Record<number, string> = {
      335951: 'https://image.tmdb.org/t/p/w342/ru4oyTVoPVQZPUE5rI3YPMgLHBY.jpg', // Summer Vacation
      307478: 'https://image.tmdb.org/t/p/w342/lrFE7DdRXu6ofhCm9dLNzsyLg92.jpg', // The Perfect Lie
      279246: 'https://image.tmdb.org/t/p/w342/3x6c9ybt0762idyzIifUZeTD5MZ.jpg', // The Remarried Empress
      303745: 'https://image.tmdb.org/t/p/w342/kSAXIAovLC4z7Wp2Hy8oqLmpkox.jpg', // Love in Disguise
    }

    // 3. Process Watchlist Dramas (Upcoming Premieres)
    for (const drama of watchlistDramas) {
      const airDate = drama.first_air_date ? String(drama.first_air_date).trim() : null
      // Only include if premiere is today or in the future
      if (airDate && airDate >= todayStr) {
        const tmdbIdNum = Number(drama.tmdb_id)
        const poster = drama.poster_url || drama.poster || KNOWN_POSTERS[tmdbIdNum] || null
        upcomingPremieres.push({
          ...drama,
          status: 'watchlist',
          poster_url: poster,
          first_air_date: airDate,
        })
      }
    }

    const allNotifiable = [...newEpisodes, ...upcomingPremieres]

    return new NextResponse(JSON.stringify(allNotifiable), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      },
    })
  } catch (err: any) {
    console.error('[api/airing] error:', err)
    return NextResponse.json([], { status: 200 })
  }
}
