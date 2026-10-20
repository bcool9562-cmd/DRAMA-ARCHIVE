import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const FIXED_USER_ID = '00000000-0000-0000-0000-000000000001'
const TABLE = 'user_dramas_v2'

// ── GET: Read all dramas directly from Supabase public.user_dramas_v2 ───────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const notifiable = searchParams.get('notifiable') === 'true'

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

    if (error) {
      console.error('[api/archive] GET query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let formatted = (data || []).map((d: any) => ({
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST: Add or update a drama in Supabase public.user_dramas_v2 ────────────

export async function POST(req: NextRequest) {
  try {
    const drama = await req.json()
    if (!drama || !drama.drama_id) {
      return NextResponse.json({ error: 'Missing drama_id' }, { status: 400 })
    }

    const firstAirDate =
      drama.first_air_date && String(drama.first_air_date).trim()
        ? String(drama.first_air_date).trim().slice(0, 10)
        : null
    const nextEpDate =
      drama.next_episode_date && String(drama.next_episode_date).trim()
        ? String(drama.next_episode_date).trim().slice(0, 10)
        : null
    const watchedEpisodes = Number(drama.watched_episodes ?? drama.next_episode_number) || 0

    const record = {
      user_id: FIXED_USER_ID,
      drama_id: String(drama.drama_id),
      tmdb_id: drama.tmdb_id ? Number(drama.tmdb_id) : null,
      title: String(drama.title || ''),
      native_title: String(drama.native_title || ''),
      poster_url: String(drama.poster_url || ''),
      country: String(drama.country || ''),
      release_year: drama.release_year ? Number(drama.release_year) : null,
      total_episodes: drama.total_episodes ? Number(drama.total_episodes) : null,
      rating: drama.rating ? Number(drama.rating) : 0,
      status: drama.status || 'watchlist',
      airing_status: drama.airing_status || 'completed',
      first_air_date: firstAirDate,
      next_episode_date: nextEpDate,
      next_episode_number: watchedEpisodes,
      updated_at: new Date().toISOString(),
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(record, { onConflict: 'user_id,drama_id' })
      .select()

    if (error) {
      console.error('[api/archive] POST upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        drama: data?.[0] || record,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
        },
      }
    )
  } catch (err: any) {
    console.error('[api/archive] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── PATCH: Move drama status or update watched episodes in Supabase ──────────

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
    }

    const dramaIdStr = String(drama_id)
    const supabase = createAdminClient()

    // 1. Primary match: user_id + drama_id
    let res = await supabase
      .from(TABLE)
      .update(updatePayload)
      .eq('user_id', FIXED_USER_ID)
      .eq('drama_id', dramaIdStr)
      .select()

    // 2. Fallback match: if 0 rows and dramaId can be parsed to integer tmdb_id
    if (!res.data || res.data.length === 0) {
      const numericId = Number(dramaIdStr.replace(/\D/g, ''))
      if (numericId) {
        res = await supabase
          .from(TABLE)
          .update(updatePayload)
          .eq('user_id', FIXED_USER_ID)
          .eq('tmdb_id', numericId)
          .select()
      }
    }

    if (res.error) {
      console.error('[api/archive] PATCH update error:', res.error)
      return NextResponse.json({ error: res.error.message }, { status: 500 })
    }

    const rowsAffected = res.data ? res.data.length : 0
    console.log(`[api/archive] Supabase PATCH for drama "${drama_id}": ${rowsAffected} rows updated.`)

    return new NextResponse(
      JSON.stringify({
        success: true,
        updated: updatePayload,
        rowsAffected,
        drama: res.data?.[0],
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
        },
      }
    )
  } catch (err: any) {
    console.error('[api/archive] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── DELETE: Remove drama from Supabase public.user_dramas_v2 ────────────────

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const drama_id = searchParams.get('id')
    if (!drama_id) {
      return NextResponse.json({ error: 'Missing drama_id' }, { status: 400 })
    }

    const dramaIdStr = String(drama_id)
    const supabase = createAdminClient()

    // 1. Primary match: user_id + drama_id
    let res = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', FIXED_USER_ID)
      .eq('drama_id', dramaIdStr)
      .select()

    // 2. Fallback match: if 0 rows and dramaId can be parsed to integer tmdb_id
    if (!res.data || res.data.length === 0) {
      const numericId = Number(dramaIdStr.replace(/\D/g, ''))
      if (numericId) {
        res = await supabase
          .from(TABLE)
          .delete()
          .eq('user_id', FIXED_USER_ID)
          .eq('tmdb_id', numericId)
          .select()
      }
    }

    if (res.error) {
      console.error('[api/archive] DELETE error:', res.error)
      return NextResponse.json({ error: res.error.message }, { status: 500 })
    }

    const rowsDeleted = res.data ? res.data.length : 0
    console.log(`[api/archive] Supabase DELETE for drama "${drama_id}": ${rowsDeleted} rows deleted.`)

    return new NextResponse(
      JSON.stringify({
        success: true,
        rowsDeleted,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
        },
      }
    )
  } catch (err: any) {
    console.error('[api/archive] DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
