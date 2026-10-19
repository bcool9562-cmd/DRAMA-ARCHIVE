/**
 * Supabase data layer for Drama Archive with Instant Optimistic UI & Event Sync.
 * Uses /api/archive server endpoint backed by SUPABASE_SECRET_KEY
 * and single profile user_id: 00000000-0000-0000-0000-000000000001.
 */

import { showToast } from '@/components/Toast'

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
  watched_episodes?: number
  updated_at: string
}

// In-memory client cache for instantaneous 0ms optimistic UI updates
let memoryCache: UserDrama[] | null = null
let activeMutationCount = 0

function getStoredCache(): UserDrama[] {
  if (memoryCache) return memoryCache
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('drama_archive_cache')
      if (saved) {
        memoryCache = JSON.parse(saved)
        return memoryCache || []
      }
    } catch {
      // ignore
    }
  }
  return []
}

function setStoredCache(dramas: UserDrama[]) {
  memoryCache = dramas
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('drama_archive_cache', JSON.stringify(dramas))
      window.dispatchEvent(new CustomEvent('drama-archive-sync', { detail: dramas }))
    } catch {
      // ignore
    }
  }
}

/** Get currently cached saved dramas synchronously (0ms) */
export function getSavedDramasSync(): UserDrama[] {
  return getStoredCache()
}

/** Subscribe to archive changes across all tabs */
export function onArchiveSync(callback: (dramas: UserDrama[]) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: Event) => {
    const custom = e as CustomEvent<UserDrama[]>
    if (custom.detail) callback(custom.detail)
  }
  window.addEventListener('drama-archive-sync', handler)
  return () => window.removeEventListener('drama-archive-sync', handler)
}

/** Fetch all dramas for the single profile, optionally filtered by status */
export async function getUserDramas(status?: DramaStatus): Promise<UserDrama[]> {
  try {
    const url = status ? `/api/archive?status=${status}` : '/api/archive'
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })

    if (!res.ok) {
      const fallback = getStoredCache()
      return status ? fallback.filter((d) => d.status === status) : fallback
    }

    const liveData = (await res.json()) as UserDrama[]
    if (Array.isArray(liveData)) {
      if (activeMutationCount === 0) {
        if (!status) {
          setStoredCache(liveData)
        } else {
          // Merge into cache
          const all = getStoredCache().filter((d) => d.status !== status)
          setStoredCache([...liveData, ...all])
        }
      }
      return liveData
    }

    return []
  } catch (err) {
    console.error('[archive] getUserDramas network error:', err)
    const fallback = getStoredCache()
    return status ? fallback.filter((d) => d.status === status) : fallback
  }
}

/** Add or update a drama with instant Optimistic UI update */
export async function addDrama(
  drama: Omit<UserDrama, 'user_id' | 'updated_at'>
): Promise<boolean> {
  const fullDrama: UserDrama = {
    ...drama,
    user_id: '00000000-0000-0000-0000-000000000001',
    updated_at: new Date().toISOString(),
  }

  // 1. Optimistic Update: Update client memory immediately (0ms latency)
  const current = getStoredCache()
  const existsIdx = current.findIndex((d) => d.drama_id === drama.drama_id)
  let updatedList: UserDrama[] = []
  if (existsIdx >= 0) {
    updatedList = [...current]
    updatedList[existsIdx] = fullDrama
  } else {
    updatedList = [fullDrama, ...current]
  }
  setStoredCache(updatedList)

  const statusLabel =
    drama.status === 'watchlist'
      ? 'Watchlist'
      : drama.status === 'watching'
      ? 'Currently Watching'
      : 'Finished'
  showToast(`Added to ${statusLabel}`, 'success')

  // 2. Background Sync to /api/archive
  activeMutationCount++
  try {
    const res = await fetch('/api/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(drama),
      cache: 'no-store',
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      showToast(errData.error || 'Failed to sync with Supabase', 'error')
      return false
    }

    return true
  } catch (err: any) {
    console.error('[archive] addDrama network error:', err)
    showToast('Network error while saving drama', 'error')
    return false
  } finally {
    activeMutationCount = Math.max(0, activeMutationCount - 1)
  }
}

/** Move a drama to a new status with instant Optimistic UI update */
export async function moveDrama(dramaId: string, newStatus: DramaStatus): Promise<boolean> {
  // 1. Optimistic Update
  const current = getStoredCache()
  const drama = current.find((d) => d.drama_id === dramaId)
  if (drama) {
    const updated = current.map((d) =>
      d.drama_id === dramaId
        ? { ...d, status: newStatus, updated_at: new Date().toISOString() }
        : d
    )
    setStoredCache(updated)

    const label =
      newStatus === 'watchlist'
        ? 'Watchlist'
        : newStatus === 'watching'
        ? 'Watching'
        : 'Finished'
    showToast(`Moved to ${label}`, 'success')
  }

  // 2. Background Sync
  activeMutationCount++
  try {
    const res = await fetch('/api/archive', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drama_id: dramaId, status: newStatus }),
      cache: 'no-store',
    })

    if (!res.ok) {
      showToast('Failed to update status on server', 'error')
      return false
    }

    return true
  } catch (err) {
    console.error('[archive] moveDrama network error:', err)
    showToast('Network error while moving drama', 'error')
    return false
  } finally {
    activeMutationCount = Math.max(0, activeMutationCount - 1)
  }
}

/** Update watched episode count with instant Optimistic UI update */
export async function updateWatchedEpisodes(dramaId: string, watched: number): Promise<boolean> {
  const current = getStoredCache()
  const drama = current.find((d) => d.drama_id === dramaId)
  if (drama) {
    const safeWatched = Math.max(0, watched)
    const updated = current.map((d) =>
      d.drama_id === dramaId
        ? {
            ...d,
            watched_episodes: safeWatched,
            next_episode_number: safeWatched,
            updated_at: new Date().toISOString(),
          }
        : d
    )
    setStoredCache(updated)
  }

  try {
    const res = await fetch('/api/archive', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drama_id: dramaId,
        watched_episodes: Math.max(0, watched),
        next_episode_number: Math.max(0, watched),
      }),
      cache: 'no-store',
    })

    return res.ok
  } catch (err) {
    console.error('[archive] updateWatchedEpisodes network error:', err)
    return false
  }
}

/** Remove a drama from the archive completely with instant Optimistic UI */
export async function removeDrama(dramaId: string): Promise<boolean> {
  // 1. Optimistic Update
  const current = getStoredCache()
  const removed = current.filter((d) => d.drama_id !== dramaId)
  setStoredCache(removed)
  showToast('Removed from archive', 'info')

  // 2. Background Sync
  activeMutationCount++
  try {
    const res = await fetch(`/api/archive?id=${encodeURIComponent(dramaId)}`, {
      method: 'DELETE',
      cache: 'no-store',
    })

    if (!res.ok) {
      showToast('Failed to remove drama from server', 'error')
      return false
    }

    return true
  } catch (err) {
    console.error('[archive] removeDrama network error:', err)
    showToast('Network error while removing drama', 'error')
    return false
  } finally {
    activeMutationCount = Math.max(0, activeMutationCount - 1)
  }
}

/** Fetch dramas that need airing notifications */
export async function getNotifiableDramas(): Promise<UserDrama[]> {
  try {
    const res = await fetch('/api/airing', { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? (data as UserDrama[]) : []
  } catch (err) {
    console.error('[archive] getNotifiableDramas error:', err)
    return []
  }
}
