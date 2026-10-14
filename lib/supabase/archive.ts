/**
 * Supabase data layer for Drama Archive.
 * Uses /api/archive server endpoint backed by SUPABASE_SECRET_KEY
 * and single profile user_id: 00000000-0000-0000-0000-000000000001.
 */

export type DramaStatus = 'watchlist' | 'watching' | 'finished'
export type AiringStatus = 'ongoing' | 'completed' | 'upcoming'

export interface UserDrama {
  user_id: string
  drama_id: string
  tmdb_id: number
  title: string
  native_title: string
  poster_url: string
  country: string
  release_year: number
  total_episodes: number
  rating: number
  status: DramaStatus
  airing_status: AiringStatus
  first_air_date: string | null
  next_episode_date: string | null
  next_episode_number: number | null
  updated_at: string
}

/** Fetch all dramas for the single profile, optionally filtered by status */
export async function getUserDramas(status?: DramaStatus): Promise<UserDrama[]> {
  try {
    const url = status ? `/api/archive?status=${status}` : '/api/archive'
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    return (await res.json()) as UserDrama[]
  } catch (err) {
    console.error('[archive] getUserDramas error:', err)
    return []
  }
}

/** Add or update a drama in the single profile archive */
export async function addDrama(drama: Omit<UserDrama, 'user_id' | 'updated_at'>): Promise<boolean> {
  try {
    const res = await fetch('/api/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(drama),
    })
    return res.ok
  } catch (err) {
    console.error('[archive] addDrama error:', err)
    return false
  }
}

/**
 * Move a drama to a new status (watchlist → watching → finished, or any direction).
 * Updates the row immediately in Supabase so it syncs across all devices instantly.
 */
export async function moveDrama(dramaId: string, newStatus: DramaStatus): Promise<boolean> {
  try {
    const res = await fetch('/api/archive', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drama_id: dramaId, status: newStatus }),
    })
    return res.ok
  } catch (err) {
    console.error('[archive] moveDrama error:', err)
    return false
  }
}

/** Remove a drama from the archive completely */
export async function removeDrama(dramaId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/archive?id=${encodeURIComponent(dramaId)}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch (err) {
    console.error('[archive] removeDrama error:', err)
    return false
  }
}

/**
 * Fetch dramas that need airing notifications:
 * - Watchlist dramas with airing_status = 'upcoming' (upcoming premieres)
 * - Watching dramas with airing_status = 'ongoing' and a next_episode_date set
 */
export async function getNotifiableDramas(): Promise<UserDrama[]> {
  try {
    const res = await fetch('/api/archive?notifiable=true', { cache: 'no-store' })
    if (!res.ok) return []
    return (await res.json()) as UserDrama[]
  } catch (err) {
    console.error('[archive] getNotifiableDramas error:', err)
    return []
  }
}
