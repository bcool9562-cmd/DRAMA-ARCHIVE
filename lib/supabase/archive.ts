/**
 * Supabase data layer for Drama Archive with Instant Optimistic UI & Cross-Device Cloud Sync.
 * Uses /api/archive as the single cloud source of truth across PC, Phone Web View, and Phone App.
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

// Storage keys
const ARCHIVE_KEY = 'scenova_archive_v1'
const LEGACY_KEY = 'drama_archive_cache'

// In-memory client cache for instantaneous 0ms optimistic UI updates
let memoryCache: UserDrama[] | null = null

function getStoredCache(): UserDrama[] {
  if (memoryCache !== null) return memoryCache
  if (typeof window !== 'undefined') {
    try {
      let raw = localStorage.getItem(ARCHIVE_KEY)
      if (!raw) {
        raw = localStorage.getItem(LEGACY_KEY)
      }
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          memoryCache = parsed
          return parsed
        }
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
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(dramas))
      localStorage.setItem(LEGACY_KEY, JSON.stringify(dramas))
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

/** Subscribe to archive changes across all tabs and components */
export function onArchiveSync(callback: (dramas: UserDrama[]) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: Event) => {
    const custom = e as CustomEvent<UserDrama[]>
    if (custom.detail) callback(custom.detail)
  }
  window.addEventListener('drama-archive-sync', handler)
  return () => window.removeEventListener('drama-archive-sync', handler)
}

let lastFetchTime = 0
const FETCH_THROTTLE_MS = 400

/**
 * Fetch all dramas from cloud /api/archive.
 * Overwrites client state directly with the exact server list (single source of truth).
 * ZERO isolated localStorage merging that could resurrect deleted items.
 */
export async function getUserDramas(status?: DramaStatus): Promise<UserDrama[]> {
  try {
    const now = Date.now()
    // Skip rapid duplicate fetches within 400ms (e.g. simultaneous focus + visibilitychange)
    if (!status && now - lastFetchTime < FETCH_THROTTLE_MS && memoryCache !== null) {
      return memoryCache
    }
    if (!status) {
      lastFetchTime = now
    }

    const url = status ? `/api/archive?status=${status}` : '/api/archive'
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    })

    if (!res.ok) {
      const fallback = getStoredCache()
      return status ? fallback.filter((d) => d.status === status) : fallback
    }

    const liveData = (await res.json()) as UserDrama[]
    if (Array.isArray(liveData)) {
      if (!status) {
        // Full archive fetch: overwrite client state with exact server list
        setStoredCache(liveData)
        return liveData
      } else {
        // Query for a single status tab: update those items in store
        const current = getStoredCache()
        const otherItems = current.filter((d) => d.status !== status)
        const combined = [...otherItems, ...liveData]
        setStoredCache(combined)
        return liveData
      }
    }

    const fallback = getStoredCache()
    return status ? fallback.filter((d) => d.status === status) : fallback
  } catch (err) {
    console.error('[archive] getUserDramas network error:', err)
    const fallback = getStoredCache()
    return status ? fallback.filter((d) => d.status === status) : fallback
  }
}

/** Convenience alias to fetch latest cloud archive */
export async function fetchArchive(): Promise<UserDrama[]> {
  return getUserDramas()
}

/** Add or update a drama with instant Optimistic UI update */
export async function addDrama(
  drama: Omit<UserDrama, 'user_id' | 'updated_at'>
): Promise<boolean> {
  const dramaIdStr = String(drama.drama_id)

  const fullDrama: UserDrama = {
    ...drama,
    drama_id: dramaIdStr,
    user_id: '00000000-0000-0000-0000-000000000001',
    updated_at: new Date().toISOString(),
  }

  // 1. Optimistic Update: Update client memory and localStorage immediately (0ms latency)
  const current = getStoredCache()
  const existsIdx = current.findIndex((d) => d.drama_id === fullDrama.drama_id)
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

  // 2. Background Sync to cloud /api/archive
  try {
    const res = await fetch('/api/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullDrama),
      cache: 'no-store',
    })
    return res.ok
  } catch (err: any) {
    console.warn('[archive] addDrama network notice, retained in local cache:', err)
    return true
  }
}

/** Move a drama to a new status with instant Optimistic UI update */
export async function moveDrama(dramaId: string, newStatus: DramaStatus): Promise<boolean> {
  // 1. Optimistic Update: Update client memory & localStorage immediately
  const current = getStoredCache()
  const drama = current.find((d) => d.drama_id === dramaId)
  if (drama) {
    const updated = current.map((d) =>
      d.drama_id === dramaId
        ? {
            ...d,
            status: newStatus,
            updated_at: new Date().toISOString(),
          }
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
  try {
    const res = await fetch('/api/archive', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drama_id: dramaId, status: newStatus }),
      cache: 'no-store',
    })
    return res.ok
  } catch (err) {
    console.warn('[archive] moveDrama network notice, retained in local cache:', err)
    return true
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
    console.warn('[archive] updateWatchedEpisodes network notice:', err)
    return true
  }
}

/** Remove a drama from the archive completely with instant Optimistic UI */
export async function removeDrama(dramaId: string): Promise<boolean> {
  // 1. Optimistic Update: Remove immediately
  const current = getStoredCache()
  const removed = current.filter((d) => d.drama_id !== dramaId)
  setStoredCache(removed)
  showToast('Removed from archive', 'info')

  // 2. Background Sync to cloud
  try {
    const res = await fetch(`/api/archive?id=${encodeURIComponent(dramaId)}`, {
      method: 'DELETE',
      cache: 'no-store',
    })
    return res.ok
  } catch (err) {
    console.warn('[archive] removeDrama network notice:', err)
    return true
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
