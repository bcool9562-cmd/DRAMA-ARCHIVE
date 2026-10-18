import { ArchiveItem, DiscoverResponse, Drama, DramaStatus } from '../types'

const BASE_URL = 'https://drama-archive-pearl.vercel.app'

/**
 * Fetch all items in user archive
 */
export async function fetchArchive(): Promise<ArchiveItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/archive`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
    if (!res.ok) {
      console.warn(`[api/archive] fetch error status: ${res.status}`)
      return []
    }
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error('[api/archive] fetch failed:', err)
    return []
  }
}

/**
 * Add or update drama in user archive
 */
export async function saveArchiveItem(item: Partial<ArchiveItem>): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    })
    return res.ok
  } catch (err) {
    console.error('[api/archive] save failed:', err)
    return false
  }
}

/**
 * Update status of existing archive item
 */
export async function updateArchiveStatus(drama_id: string, status: DramaStatus): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/archive`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ drama_id, status }),
    })
    return res.ok
  } catch (err) {
    console.error('[api/archive] status update failed:', err)
    return false
  }
}

/**
 * Delete drama from archive
 */
export async function deleteArchiveItem(drama_id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/archive?id=${encodeURIComponent(drama_id)}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch (err) {
    console.error('[api/archive] delete failed:', err)
    return false
  }
}

/**
 * Fetch discover page data (Hero, Talk of the town, Rows)
 */
export async function fetchDiscover(): Promise<DiscoverResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/discover`, {
      headers: {
        'Accept': 'application/json',
      },
    })
    if (!res.ok) {
      throw new Error(`Discover fetch failed: ${res.status}`)
    }
    const data = await res.json()
    return {
      hero: data.hero || [],
      talkOfTheTown: data.talkOfTheTown || [],
      rows: data.rows || [],
    }
  } catch (err) {
    console.error('[api/discover] fetch error:', err)
    return { hero: [], talkOfTheTown: [], rows: [] }
  }
}

/**
 * Search TMDB dramas via Next.js backend proxy
 */
export async function searchDramas(query: string): Promise<Drama[]> {
  if (!query || !query.trim()) return []
  try {
    const res = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(query.trim())}`, {
      headers: {
        'Accept': 'application/json',
      },
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error('[api/search] search error:', err)
    return []
  }
}

/**
 * Fetch full drama detail by ID
 */
export async function fetchDramaDetail(id: string): Promise<Drama | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/drama/${encodeURIComponent(id)}`, {
      headers: {
        'Accept': 'application/json',
      },
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error(`[api/drama/${id}] fetch error:`, err)
    return null
  }
}
