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
  local_mutated_at?: number
}

// Storage keys
const ARCHIVE_KEY = 'scenova_archive_v1'
const LEGACY_KEY = 'drama_archive_cache'
const DELETED_KEY = 'scenova_deleted_ids'

// In-memory client cache for instantaneous 0ms optimistic UI updates
let memoryCache: UserDrama[] | null = null
let activeMutationCount = 0

function getDeletedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(DELETED_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return new Set(arr)
    }
  } catch {
    // ignore
  }
  return new Set()
}

function markDeletedId(id: string) {
  if (typeof window === 'undefined') return
  try {
    const set = getDeletedIds()
    set.add(id)
    localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // ignore
  }
}

function unmarkDeletedId(id: string) {
  if (typeof window === 'undefined') return
  try {
    const set = getDeletedIds()
    set.delete(id)
    localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // ignore
  }
}

function getStoredCache(): UserDrama[] {
  if (memoryCache && memoryCache.length > 0) return memoryCache
  if (typeof window !== 'undefined') {
    try {
      const deletedIds = getDeletedIds()
      let raw = localStorage.getItem(ARCHIVE_KEY)
      if (!raw) {
        raw = localStorage.getItem(LEGACY_KEY)
      }
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(
            (d) => !deletedIds.has(d.drama_id) && !deletedIds.has(String(d.tmdb_id))
          )
          memoryCache = filtered
          return filtered
        }
      }
    } catch {
      // ignore
    }
  }
  return []
}

function setStoredCache(dramas: UserDrama[]) {
  const deletedIds = getDeletedIds()
  const clean = dramas.filter(
    (d) => !deletedIds.has(d.drama_id) && !deletedIds.has(String(d.tmdb_id))
  )
  memoryCache = clean
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(clean))
      localStorage.setItem(LEGACY_KEY, JSON.stringify(clean))
      window.dispatchEvent(new CustomEvent('drama-archive-sync', { detail: clean }))
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

/** Fetch all dramas for the single profile, optionally filtered by status with intelligent reconciliation */
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
      const deletedIds = getDeletedIds()
      const currentCache = getStoredCache()
      const localMap = new Map<string, UserDrama>()

      // 1. Seed with existing local items
      for (const item of currentCache) {
        if (!deletedIds.has(item.drama_id) && !deletedIds.has(String(item.tmdb_id))) {
          localMap.set(item.drama_id, item)
        }
      }

      // 2. Intelligently reconcile server items
      for (const serverItem of liveData) {
        if (deletedIds.has(serverItem.drama_id) || deletedIds.has(String(serverItem.tmdb_id))) {
          continue // User explicitly deleted this item locally; NEVER resurrect it
        }

        const localItem = localMap.get(serverItem.drama_id)
        if (!localItem) {
          // New drama from server not in local cache
          localMap.set(serverItem.drama_id, serverItem)
        } else {
          // If local item was mutated recently (within 15 minutes), preserve local changes!
          const recentLocalMutation =
            localItem.local_mutated_at && Date.now() - localItem.local_mutated_at < 15 * 60 * 1000
          if (recentLocalMutation) {
            // Keep local version
            continue
          }

          // Otherwise if server has newer updated_at timestamp, accept server changes
          const localTime = new Date(localItem.updated_at || 0).getTime()
          const serverTime = new Date(serverItem.updated_at || 0).getTime()
          if (serverTime > localTime) {
            localMap.set(serverItem.drama_id, serverItem)
          }
        }
      }

      const reconciled = Array.from(localMap.values())
      setStoredCache(reconciled)

      return status ? reconciled.filter((d) => d.status === status) : reconciled
    }

    const fallback = getStoredCache()
    return status ? fallback.filter((d) => d.status === status) : fallback
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
  const dramaIdStr = String(drama.drama_id)
  unmarkDeletedId(dramaIdStr)
  if (drama.tmdb_id) unmarkDeletedId(String(drama.tmdb_id))

  const fullDrama: UserDrama = {
    ...drama,
    drama_id: dramaIdStr,
    user_id: '00000000-0000-0000-0000-000000000001',
    updated_at: new Date().toISOString(),
    local_mutated_at: Date.now(),
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

  // 2. Background Sync to /api/archive
  activeMutationCount++
  try {
    await fetch('/api/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullDrama),
      cache: 'no-store',
    })
    return true
  } catch (err: any) {
    console.warn('[archive] addDrama network notice, retained in local cache:', err)
    return true
  } finally {
    activeMutationCount = Math.max(0, activeMutationCount - 1)
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
            local_mutated_at: Date.now(),
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
  activeMutationCount++
  try {
    await fetch('/api/archive', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drama_id: dramaId, status: newStatus }),
      cache: 'no-store',
    })
    return true
  } catch (err) {
    console.warn('[archive] moveDrama network notice, retained in local cache:', err)
    return true
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
            local_mutated_at: Date.now(),
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
  // 1. Mark as deleted in persistent set so stale server calls can never resurrect it
  markDeletedId(dramaId)

  // 2. Optimistic Update
  const current = getStoredCache()
  const removed = current.filter((d) => d.drama_id !== dramaId)
  setStoredCache(removed)
  showToast('Removed from archive', 'info')

  // 3. Background Sync
  activeMutationCount++
  try {
    await fetch(`/api/archive?id=${encodeURIComponent(dramaId)}`, {
      method: 'DELETE',
      cache: 'no-store',
    })
    return true
  } catch (err) {
    console.warn('[archive] removeDrama network notice:', err)
    return true
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
