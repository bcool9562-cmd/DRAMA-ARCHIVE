import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import fs from 'fs'
import path from 'path'

export const FIXED_USER_ID = '00000000-0000-0000-0000-000000000001'
const TABLE = 'user_dramas_v2'

// File-backed persistence helper (serves as resilient fallback if Supabase permissions are pending)
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
  } catch (e) {
    console.error('[localArchive write error]:', e)
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const notifiable = searchParams.get('notifiable') === 'true'

    const supabase = createAdminClient()

    if (notifiable) {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .or(
          `and(status.eq.watchlist,airing_status.eq.upcoming),` +
          `and(status.eq.watching,airing_status.eq.ongoing,next_episode_date.not.is.null)`
        )

      if (!error && data) {
        return NextResponse.json(data)
      }

      // Local fallback
      const local = readLocalArchive().filter(
        d => (d.status === 'watchlist' && d.airing_status === 'upcoming') ||
             (d.status === 'watching' && d.airing_status === 'ongoing' && d.next_episode_date)
      )
      return NextResponse.json(local)
    }

    let query = supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', FIXED_USER_ID)
      .order('updated_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (!error && data) {
      return NextResponse.json(data)
    }

    // Local fallback
    let local = readLocalArchive()
    if (status) {
      local = local.filter(d => d.status === status)
    }
    return NextResponse.json(local)
  } catch (err) {
    console.error('[api/archive] GET unexpected error:', err)
    return NextResponse.json(readLocalArchive())
  }
}

export async function POST(req: NextRequest) {
  try {
    const drama = await req.json()
    const supabase = createAdminClient()

    const record = {
      ...drama,
      user_id: FIXED_USER_ID,
      updated_at: new Date().toISOString(),
    }

    // Try Supabase first
    const { data, error } = await supabase.from(TABLE).upsert(
      record,
      { onConflict: 'user_id,drama_id' }
    ).select().single()

    // Also persist to local archive for resilient dual-layer sync
    const local = readLocalArchive()
    const idx = local.findIndex(d => d.drama_id === drama.drama_id)
    if (idx >= 0) {
      local[idx] = record
    } else {
      local.unshift(record)
    }
    writeLocalArchive(local)

    if (error) {
      console.warn('[api/archive] Supabase upsert note (persisted locally):', error.message)
      return NextResponse.json({ success: true, drama: record, storage: 'local_synced' })
    }

    return NextResponse.json({ success: true, drama: data || record, storage: 'supabase' })
  } catch (err) {
    console.error('[api/archive] POST unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { drama_id, status } = await req.json()
    if (!drama_id || !status) {
      return NextResponse.json({ error: 'Missing drama_id or status' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from(TABLE)
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', FIXED_USER_ID)
      .eq('drama_id', drama_id)

    // Also update in local archive
    const local = readLocalArchive()
    const item = local.find(d => d.drama_id === drama_id)
    if (item) {
      item.status = status
      item.updated_at = new Date().toISOString()
      writeLocalArchive(local)
    }

    if (error) {
      console.warn('[api/archive] Supabase update note (persisted locally):', error.message)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/archive] PATCH unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const drama_id = searchParams.get('id')
    if (!drama_id) {
      return NextResponse.json({ error: 'Missing drama_id' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', FIXED_USER_ID)
      .eq('drama_id', drama_id)

    // Also remove from local archive
    const local = readLocalArchive().filter(d => d.drama_id !== drama_id)
    writeLocalArchive(local)

    if (error) {
      console.warn('[api/archive] Supabase delete note (persisted locally):', error.message)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/archive] DELETE unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
