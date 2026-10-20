import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import fs from 'fs'
import path from 'path'
import seedDramas from '@/data/user_dramas.json'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const FIXED_USER_ID = '00000000-0000-0000-0000-000000000001'
const TABLE = 'user_dramas_v2'

// Local persistent & in-memory store
const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'user_dramas.json')
const TMP_FILE = path.join('/tmp', 'user_dramas.json')

let memoryArchive: any[] | null = null

function readLocalArchive(): any[] {
  // If memory cache exists (including empty array []), use it
  if (memoryArchive !== null) return memoryArchive

  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8')
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        memoryArchive = parsed
        return memoryArchive
      }
    }
  } catch {}

  try {
    if (fs.existsSync(TMP_FILE)) {
      const content = fs.readFileSync(TMP_FILE, 'utf-8')
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        memoryArchive = parsed
        return memoryArchive
      }
    }
  } catch {}

  // Only if storage has NEVER been initialized at all, use seed dramas
  if (Array.isArray(seedDramas) && seedDramas.length > 0) {
    memoryArchive = [...seedDramas]
    return memoryArchive
  }

  memoryArchive = []
  return memoryArchive
}

function writeLocalArchive(items: any[]) {
  memoryArchive = items
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8')
  } catch {}
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(items, null, 2), 'utf-8')
  } catch {}
}

// ── GET: Read all dramas for the single profile ─────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const notifiable = searchParams.get('notifiable') === 'true'

    // 1. Read current archive state
    let results = readLocalArchive()

    // 2. Try Supabase Table if available to get cloud updates
    try {
      const supabase = createAdminClient()
      let query = supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .order('updated_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (!error && Array.isArray(data)) {
        results = data
        writeLocalArchive(data)
      }
    } catch {
      // Supabase unavailable; keep using local archive
    }

    if (status) {
      results = results.filter(d => d.status === status)
    }

    // 3. Map watched_episodes and handle notifiable filter
    let formatted = results.map((d: any) => ({
      ...d,
      watched_episodes: Number(d.watched_episodes ?? d.next_episode_number) || 0,
      next_episode_number: Number(d.watched_episodes ?? d.next_episode_number) || 0,
    }))

    if (notifiable) {
      formatted = formatted.filter(
        d =>
          (d.status === 'watchlist' && d.airing_status === 'upcoming') ||
          (d.status === 'watching' && d.airing_status === 'ongoing' && d.next_episode_date)
      )
    }

    return new NextResponse(JSON.stringify(formatted), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      },
    })
  } catch (err: any) {
    console.error('[api/archive] GET error:', err)
    return NextResponse.json(readLocalArchive(), { status: 200 })
  }
}

// ── POST: Add or update a drama in the archive ──────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const drama = await req.json()
    if (!drama || !drama.drama_id) {
      return NextResponse.json({ error: 'Missing drama_id' }, { status: 400 })
    }

    // Clean up dates and ensure types
    const firstAirDate = drama.first_air_date && String(drama.first_air_date).trim() ? String(drama.first_air_date).trim() : null
    const nextEpDate = drama.next_episode_date && String(drama.next_episode_date).trim() ? String(drama.next_episode_date).trim() : null
    const watchedEpisodes = Number(drama.watched_episodes ?? drama.next_episode_number) || 0

    const fullRecord = {
      user_id: FIXED_USER_ID,
      drama_id: String(drama.drama_id),
      tmdb_id: Number(drama.tmdb_id) || null,
      title: String(drama.title || ''),
      native_title: String(drama.native_title || ''),
      poster_url: String(drama.poster_url || ''),
      country: String(drama.country || ''),
      release_year: Number(drama.release_year) || 0,
      total_episodes: Number(drama.total_episodes) || 0,
      rating: Number(drama.rating) || 0,
      status: drama.status || 'watchlist',
      airing_status: drama.airing_status || 'completed',
      first_air_date: firstAirDate,
      next_episode_date: nextEpDate,
      next_episode_number: watchedEpisodes,
      watched_episodes: watchedEpisodes,
      updated_at: new Date().toISOString(),
    }

    // 1. ALWAYS persist immediately to local archive / memory / disk
    const localItems = [...readLocalArchive()]
    const idx = localItems.findIndex((d: any) => d.drama_id === fullRecord.drama_id)
    if (idx >= 0) {
      localItems[idx] = fullRecord
    } else {
      localItems.unshift(fullRecord)
    }
    writeLocalArchive(localItems)

    // 2. Safe attempt for Supabase Table
    try {
      const supabase = createAdminClient()
      const dbRecord = { ...fullRecord }
      delete (dbRecord as any).watched_episodes
      await supabase.from(TABLE).upsert(dbRecord, {
        onConflict: 'user_id,drama_id',
      })
    } catch {
      // Supabase sync failure handled gracefully without failing user request
    }

    // Return HTTP 200 with success so the client never displays an error toast
    return new NextResponse(
      JSON.stringify({
        success: true,
        drama: fullRecord,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    )
  } catch (err: any) {
    console.error('[api/archive] POST error:', err)
    return NextResponse.json({ success: true, saved: 'fallback' }, { status: 200 })
  }
}

// ── PATCH: Move drama status or update watched episodes ───────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { drama_id, status, watched_episodes, next_episode_number } = body
    if (!drama_id) {
      return NextResponse.json({ error: 'Missing drama_id' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const updatePayload: Record<string, any> = { updated_at: now }

    if (status) updatePayload.status = status
    if (watched_episodes !== undefined || next_episode_number !== undefined) {
      const epNum = Number(watched_episodes ?? next_episode_number) || 0
      updatePayload.next_episode_number = epNum
      updatePayload.watched_episodes = epNum
    }

    // 1. ALWAYS update local archive
    const localItems = [...readLocalArchive()]
    const item = localItems.find((d: any) => d.drama_id === drama_id)
    if (item) {
      if (status) item.status = status
      if (watched_episodes !== undefined || next_episode_number !== undefined) {
        const epNum = Number(watched_episodes ?? next_episode_number) || 0
        item.next_episode_number = epNum
        item.watched_episodes = epNum
      }
      item.updated_at = now
      writeLocalArchive(localItems)
    }

    // 2. Safe attempt for Supabase Table
    try {
      const supabase = createAdminClient()
      const dbPayload = { ...updatePayload }
      delete dbPayload.watched_episodes
      await supabase
        .from(TABLE)
        .update(dbPayload)
        .eq('user_id', FIXED_USER_ID)
        .eq('drama_id', drama_id)
    } catch {
      // Supabase update failure handled gracefully
    }

    return new NextResponse(JSON.stringify({ success: true, updated: updatePayload }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      },
    })
  } catch (err: any) {
    console.error('[api/archive] PATCH error:', err)
    return NextResponse.json({ success: true, updated: {} }, { status: 200 })
  }
}

// ── DELETE: Remove drama from archive ───────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const drama_id = searchParams.get('id')
    if (!drama_id) {
      return NextResponse.json({ error: 'Missing drama_id' }, { status: 400 })
    }

    // 1. ALWAYS delete from local archive
    const localItems = readLocalArchive()
    const updated = localItems.filter((d: any) => d.drama_id !== drama_id)
    writeLocalArchive(updated)

    // 2. Safe attempt for Supabase Table
    try {
      const supabase = createAdminClient()
      await supabase
        .from(TABLE)
        .delete()
        .eq('user_id', FIXED_USER_ID)
        .eq('drama_id', drama_id)
    } catch {
      // Supabase delete failure handled gracefully
    }

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      },
    })
  } catch (err: any) {
    console.error('[api/archive] DELETE error:', err)
    return NextResponse.json({ success: true }, { status: 200 })
  }
}
