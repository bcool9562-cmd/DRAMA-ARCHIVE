import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import fs from 'fs'
import path from 'path'

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
  // If in-memory cache exists (including an empty array []), return it directly
  if (memoryArchive !== null) return memoryArchive

  // 1. Read /tmp first (on serverless platforms like Vercel, mutations persist in /tmp during lambda runtime)
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

  // 2. Read committed data file
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

    // 1. Attempt reading live database rows from Supabase
    let liveDbData: any[] | null = null
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .order('updated_at', { ascending: false })

      if (!error && Array.isArray(data) && data.length > 0) {
        liveDbData = data
        // Always write full live table into local cache so mutations are preserved
        writeLocalArchive(data)
      }
    } catch (e: any) {
      console.warn('[api/archive] Supabase GET note:', e?.message || e)
    }

    // 2. Use live database rows if available, otherwise read current local state (no static seed merge)
    let results: any[] = liveDbData !== null ? liveDbData : [...readLocalArchive()]

    // 3. Filter by status in memory right before returning
    if (status) {
      results = results.filter((d: any) => d.status === status)
    }

    // 4. Map episode counters and handle notifiable filter
    let formatted = results.map((d: any) => ({
      ...d,
      watched_episodes: Number(d.watched_episodes ?? d.next_episode_number) || 0,
      next_episode_number: Number(d.watched_episodes ?? d.next_episode_number) || 0,
    }))

    if (notifiable) {
      formatted = formatted.filter(
        (d: any) =>
          (d.status === 'watchlist' && d.airing_status === 'upcoming') ||
          (d.status === 'watching' && d.airing_status === 'ongoing' && d.next_episode_date)
      )
    }

    return new NextResponse(JSON.stringify(formatted), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
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

    // 1. Immediately persist locally (memory and disk)
    const localItems = [...readLocalArchive()]
    const idx = localItems.findIndex((d: any) => d.drama_id === fullRecord.drama_id)
    if (idx >= 0) {
      localItems[idx] = fullRecord
    } else {
      localItems.unshift(fullRecord)
    }
    writeLocalArchive(localItems)

    // 2. Persist to Supabase Table with .select() verification
    try {
      const supabase = createAdminClient()
      const dbRecord = { ...fullRecord }
      delete (dbRecord as any).watched_episodes

      const { data, error } = await supabase
        .from(TABLE)
        .upsert(dbRecord, { onConflict: 'user_id,drama_id' })
        .select()

      console.log('[api/archive] Supabase POST upsert rows:', data ? data.length : 0, error ? error.message : 'OK')
    } catch (err: any) {
      console.warn('[api/archive] Supabase POST note:', err?.message || err)
    }

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

    // 1. Update local archive immediately
    const localItems = [...readLocalArchive()]
    const item = localItems.find((d: any) => d.drama_id === drama_id || String(d.tmdb_id) === String(drama_id))
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

    // 2. Update Supabase Table with chained .select() and fallback matching
    let rowsAffected = 0
    try {
      const supabase = createAdminClient()
      const dbPayload = { ...updatePayload }
      delete dbPayload.watched_episodes

      // Try 1: user_id + drama_id
      let res = await supabase
        .from(TABLE)
        .update(dbPayload)
        .eq('user_id', FIXED_USER_ID)
        .eq('drama_id', drama_id)
        .select()

      if (res.data && res.data.length > 0) {
        rowsAffected = res.data.length
      } else {
        // Try 2: match by tmdb_id (numeric)
        const tmdbNum = Number(String(drama_id).replace(/\D/g, ''))
        if (tmdbNum) {
          res = await supabase
            .from(TABLE)
            .update(dbPayload)
            .eq('user_id', FIXED_USER_ID)
            .eq('tmdb_id', tmdbNum)
            .select()

          if (res.data && res.data.length > 0) {
            rowsAffected = res.data.length
          }
        }
      }

      // Try 3: match without user_id restriction if 0 rows matched
      if (rowsAffected === 0) {
        res = await supabase
          .from(TABLE)
          .update(dbPayload)
          .eq('drama_id', drama_id)
          .select()

        if (res.data && res.data.length > 0) {
          rowsAffected = res.data.length
        }
      }

      // Try 4: match by title if available
      if (rowsAffected === 0 && item?.title) {
        res = await supabase
          .from(TABLE)
          .update(dbPayload)
          .eq('title', item.title)
          .select()

        if (res.data && res.data.length > 0) {
          rowsAffected = res.data.length
        }
      }

      console.log(`[api/archive] Supabase PATCH for drama "${drama_id}": ${rowsAffected} rows updated.`)
    } catch (err: any) {
      console.warn('[api/archive] Supabase PATCH note:', err?.message || err)
    }

    return new NextResponse(JSON.stringify({ success: true, updated: updatePayload, rowsAffected }), {
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

    // 1. Delete from local archive immediately
    const localItems = readLocalArchive()
    const updated = localItems.filter(
      (d: any) => d.drama_id !== drama_id && String(d.tmdb_id) !== String(drama_id)
    )
    writeLocalArchive(updated)

    // 2. Delete from Supabase Table with chained .select() and fallback matching
    let rowsDeleted = 0
    try {
      const supabase = createAdminClient()

      // Try 1: user_id + drama_id
      let res = await supabase
        .from(TABLE)
        .delete()
        .eq('user_id', FIXED_USER_ID)
        .eq('drama_id', drama_id)
        .select()

      if (res.data && res.data.length > 0) {
        rowsDeleted = res.data.length
      } else {
        // Try 2: match by tmdb_id (numeric)
        const tmdbNum = Number(String(drama_id).replace(/\D/g, ''))
        if (tmdbNum) {
          res = await supabase
            .from(TABLE)
            .delete()
            .eq('user_id', FIXED_USER_ID)
            .eq('tmdb_id', tmdbNum)
            .select()

          if (res.data && res.data.length > 0) {
            rowsDeleted = res.data.length
          }
        }
      }

      // Try 3: match without user_id restriction if 0 rows matched
      if (rowsDeleted === 0) {
        res = await supabase
          .from(TABLE)
          .delete()
          .eq('drama_id', drama_id)
          .select()

        if (res.data && res.data.length > 0) {
          rowsDeleted = res.data.length
        }
      }

      console.log(`[api/archive] Supabase DELETE for drama "${drama_id}": ${rowsDeleted} rows deleted.`)
    } catch (err: any) {
      console.warn('[api/archive] Supabase DELETE note:', err?.message || err)
    }

    return new NextResponse(JSON.stringify({ success: true, rowsDeleted }), {
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
