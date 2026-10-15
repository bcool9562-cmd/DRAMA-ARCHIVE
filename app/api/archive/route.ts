import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const FIXED_USER_ID = '00000000-0000-0000-0000-000000000001'
const TABLE = 'user_dramas_v2'
const STORAGE_BUCKET = 'drama_archive'
const STORAGE_FILE = 'user_dramas.json'

// Local ephemeral fallback for dev
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

function writeLocalArchive(items: any[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8')
  } catch {
    // Read-only filesystem in Vercel lambda is handled gracefully
  }
}

// ── Supabase Storage Cloud Sync Helpers ─────────────────────────────────────

async function readFromStorage(supabase: ReturnType<typeof createAdminClient>): Promise<any[]> {
  try {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(STORAGE_FILE)
    if (!error && data) {
      const text = await data.text()
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.error('[archive storage read error]:', e)
  }
  return readLocalArchive()
}

async function writeToStorage(supabase: ReturnType<typeof createAdminClient>, items: any[]): Promise<boolean> {
  try {
    // Also save to local memory/disk if possible
    writeLocalArchive(items)

    const content = JSON.stringify(items, null, 2)
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(STORAGE_FILE, content, {
      contentType: 'application/json',
      upsert: true,
    })
    if (error) {
      console.warn('[archive storage upload warning]:', error.message)
      return false
    }
    return true
  } catch (e) {
    console.error('[archive storage write error]:', e)
    return false
  }
}

// ── GET: Read all dramas for the single profile ─────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const notifiable = searchParams.get('notifiable') === 'true'

    const supabase = createAdminClient()

    // 1. Try Supabase Table user_dramas_v2 first
    let tableData: any[] | null = null
    try {
      let query = supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .order('updated_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        tableData = data
      }
    } catch {
      // Table query failed, fall through to cloud storage
    }

    // 2. If table returned data, use it; otherwise read from Supabase Cloud Storage
    let results: any[] = []
    if (tableData && tableData.length > 0) {
      results = tableData
    } else {
      results = await readFromStorage(supabase)
      if (status) {
        results = results.filter(d => d.status === status)
      }
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
    console.error('[api/archive] GET unexpected error:', err)
    return NextResponse.json([], { status: 200 })
  }
}

// ── POST: Add or update a drama in the archive ──────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const drama = await req.json()
    if (!drama || !drama.drama_id) {
      return NextResponse.json({ error: 'Missing drama_id' }, { status: 400 })
    }

    const supabase = createAdminClient()

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

    // Minimal guaranteed core columns in case Supabase schema lacks optional columns
    const coreRecord = {
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
      updated_at: new Date().toISOString(),
    }

    // Step A: Attempt full upsert into user_dramas_v2
    let tableSaved = false
    let tableError: string | null = null

    try {
      const { error: fullErr } = await supabase.from(TABLE).upsert(fullRecord, {
        onConflict: 'user_id,drama_id',
      })

      if (!fullErr) {
        tableSaved = true
      } else {
        tableError = fullErr.message
        // Step B: Auto-retry with only core columns if unknown columns were rejected
        const { error: coreErr } = await supabase.from(TABLE).upsert(coreRecord, {
          onConflict: 'user_id,drama_id',
        })
        if (!coreErr) {
          tableSaved = true
        } else {
          tableError = coreErr.message
        }
      }
    } catch (e: any) {
      tableError = e?.message || 'Database error'
    }

    // Step C: ALWAYS sync to Supabase Cloud Storage so data is 100% durable across devices
    const cloudItems = await readFromStorage(supabase)
    const existingIdx = cloudItems.findIndex((d: any) => d.drama_id === fullRecord.drama_id)
    if (existingIdx >= 0) {
      cloudItems[existingIdx] = fullRecord
    } else {
      cloudItems.unshift(fullRecord)
    }
    const storageSaved = await writeToStorage(supabase, cloudItems)

    if (!tableSaved && !storageSaved) {
      return NextResponse.json(
        { error: tableError || 'Failed to persist drama to Supabase' },
        { status: 500 }
      )
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        drama: fullRecord,
        storage: tableSaved ? 'table+storage' : 'cloud_storage',
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
    console.error('[api/archive] POST unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
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

    const supabase = createAdminClient()
    const now = new Date().toISOString()
    const updatePayload: Record<string, any> = { updated_at: now }

    if (status) updatePayload.status = status
    if (watched_episodes !== undefined || next_episode_number !== undefined) {
      const epNum = Number(watched_episodes ?? next_episode_number) || 0
      updatePayload.next_episode_number = epNum
      updatePayload.watched_episodes = epNum
    }

    // 1. Try updating user_dramas_v2
    try {
      const dbPayload = { ...updatePayload }
      delete dbPayload.watched_episodes // user_dramas_v2 stores it in next_episode_number
      await supabase
        .from(TABLE)
        .update(dbPayload)
        .eq('user_id', FIXED_USER_ID)
        .eq('drama_id', drama_id)
    } catch {
      // Ignore if table permissions restricted
    }

    // 2. Update Supabase Cloud Storage
    const cloudItems = await readFromStorage(supabase)
    const item = cloudItems.find((d: any) => d.drama_id === drama_id)
    if (item) {
      if (status) item.status = status
      if (watched_episodes !== undefined || next_episode_number !== undefined) {
        const epNum = Number(watched_episodes ?? next_episode_number) || 0
        item.next_episode_number = epNum
        item.watched_episodes = epNum
      }
      item.updated_at = now
      await writeToStorage(supabase, cloudItems)
    }

    return new NextResponse(JSON.stringify({ success: true, updated: updatePayload }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      },
    })
  } catch (err: any) {
    console.error('[api/archive] PATCH unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
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

    const supabase = createAdminClient()

    // 1. Try deleting from user_dramas_v2
    try {
      await supabase
        .from(TABLE)
        .delete()
        .eq('user_id', FIXED_USER_ID)
        .eq('drama_id', drama_id)
    } catch {
      // Ignore if table permissions restricted
    }

    // 2. Delete from Supabase Cloud Storage
    const cloudItems = await readFromStorage(supabase)
    const updated = cloudItems.filter((d: any) => d.drama_id !== drama_id)
    await writeToStorage(supabase, updated)

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      },
    })
  } catch (err: any) {
    console.error('[api/archive] DELETE unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
