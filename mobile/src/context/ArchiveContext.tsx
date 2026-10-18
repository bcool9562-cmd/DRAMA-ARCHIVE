import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { ArchiveItem, DiscoverResponse, Drama, DramaAlert, DramaStatus } from '../types'
import { fetchArchive, fetchDiscover, saveArchiveItem, updateArchiveStatus, deleteArchiveItem } from '../api/client'

const ARCHIVE_CACHE_KEY = '@scenova_archive_cache'
const DISCOVER_CACHE_KEY = '@scenova_discover_cache'

interface ArchiveContextValue {
  archive: ArchiveItem[]
  discoverData: DiscoverResponse | null
  isLoading: boolean
  watchlist: ArchiveItem[]
  watching: ArchiveItem[]
  finished: ArchiveItem[]
  alerts: DramaAlert[]
  updateDramaStatus: (drama: Partial<ArchiveItem> | Drama, status: DramaStatus | null) => Promise<void>
  refreshData: () => Promise<void>
  getDramaStatus: (dramaId: string | number) => DramaStatus | null
}

const ArchiveContext = createContext<ArchiveContextValue | undefined>(undefined)

export const ArchiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [archive, setArchive] = useState<ArchiveItem[]>([])
  const [discoverData, setDiscoverData] = useState<DiscoverResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // 1. Instant cache restoration on mount (0.1s offline/online render)
  useEffect(() => {
    let isMounted = true

    async function loadCacheAndSync() {
      try {
        const [cachedArchiveJson, cachedDiscoverJson] = await Promise.all([
          AsyncStorage.getItem(ARCHIVE_CACHE_KEY),
          AsyncStorage.getItem(DISCOVER_CACHE_KEY),
        ])

        if (cachedArchiveJson && isMounted) {
          try {
            const parsed = JSON.parse(cachedArchiveJson)
            if (Array.isArray(parsed)) setArchive(parsed)
          } catch (e) {}
        }

        if (cachedDiscoverJson && isMounted) {
          try {
            const parsed = JSON.parse(cachedDiscoverJson)
            if (parsed) setDiscoverData(parsed)
          } catch (e) {}
        }
      } catch (err) {
        console.warn('[ArchiveContext] Cache restore error:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }

      // Background fresh sync from cloud
      try {
        const [freshArchive, freshDiscover] = await Promise.all([
          fetchArchive(),
          fetchDiscover(),
        ])

        if (isMounted) {
          if (freshArchive && freshArchive.length > 0) {
            setArchive(freshArchive)
            await AsyncStorage.setItem(ARCHIVE_CACHE_KEY, JSON.stringify(freshArchive))
          }
          if (freshDiscover && freshDiscover.talkOfTheTown.length > 0) {
            setDiscoverData(freshDiscover)
            await AsyncStorage.setItem(DISCOVER_CACHE_KEY, JSON.stringify(freshDiscover))
          }
        }
      } catch (err) {
        console.warn('[ArchiveContext] Fresh sync error:', err)
      }
    }

    loadCacheAndSync()

    return () => {
      isMounted = false
    }
  }, [])

  // 2. Computed list views for zero lag
  const watchlist = useMemo(() => archive.filter(i => i.status === 'watchlist'), [archive])
  const watching = useMemo(() => archive.filter(i => i.status === 'watching'), [archive])
  const finished = useMemo(() => archive.filter(i => i.status === 'finished'), [archive])

  // 3. Computed notifications/alerts
  const alerts = useMemo<DramaAlert[]>(() => {
    const list: DramaAlert[] = []
    for (const item of archive) {
      if (item.status === 'watchlist' && item.airing_status === 'upcoming') {
        list.push({
          dramaId: item.drama_id,
          title: item.title,
          posterUrl: item.poster_url,
          airingDate: item.next_episode_date,
          message: item.next_episode_date
            ? `Premieres on ${item.next_episode_date}!`
            : 'Premiere date coming soon!',
          type: 'upcoming',
        })
      } else if (item.status === 'watching' && item.next_episode_date) {
        list.push({
          dramaId: item.drama_id,
          title: item.title,
          posterUrl: item.poster_url,
          airingDate: item.next_episode_date,
          message: `Episode ${Number(item.watched_episodes || 0) + 1} drops ${item.next_episode_date}!`,
          type: 'ongoing',
        })
      }
    }
    return list
  }, [archive])

  // Helper to query item status
  const getDramaStatus = (dramaId: string | number): DramaStatus | null => {
    const sId = String(dramaId)
    const item = archive.find(i => String(i.drama_id) === sId)
    return item ? item.status : null
  }

  // 4. Instant 0ms optimistic status updater with tactile haptics
  const updateDramaStatus = async (
    target: Partial<ArchiveItem> | Drama,
    newStatus: DramaStatus | null
  ) => {
    // Tactile haptic feedback immediately
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}

    const dramaId = String('drama_id' in target && target.drama_id ? target.drama_id : (target as Drama).dramaId || (target as any).tmdbId)
    if (!dramaId) return

    let updatedArchive: ArchiveItem[] = []

    if (newStatus === null) {
      // Remove drama
      updatedArchive = archive.filter(i => String(i.drama_id) !== dramaId)
      setArchive(updatedArchive)
      AsyncStorage.setItem(ARCHIVE_CACHE_KEY, JSON.stringify(updatedArchive)).catch(() => {})
      deleteArchiveItem(dramaId).catch(() => {})
      return
    }

    const existingIndex = archive.findIndex(i => String(i.drama_id) === dramaId)

    if (existingIndex >= 0) {
      // Update existing item status
      const existing = archive[existingIndex]
      const updatedItem: ArchiveItem = {
        ...existing,
        status: newStatus,
        updated_at: new Date().toISOString(),
      }
      updatedArchive = [...archive]
      updatedArchive[existingIndex] = updatedItem
      setArchive(updatedArchive)
      AsyncStorage.setItem(ARCHIVE_CACHE_KEY, JSON.stringify(updatedArchive)).catch(() => {})
      updateArchiveStatus(dramaId, newStatus).catch(() => {})
    } else {
      // Add new item into archive
      const newItem: ArchiveItem = {
        drama_id: dramaId,
        title: target.title || 'Untitled',
        native_title: (target as any).native_title || (target as any).nativeTitle,
        poster_url: (target as any).poster_url || (target as any).posterUrl,
        backdrop_url: (target as any).backdrop_url || (target as any).backdropUrl,
        release_year: (target as any).release_year || (target as any).releaseYear,
        total_episodes: (target as any).total_episodes || (target as any).totalEpisodes,
        country: (target as any).country,
        status: newStatus,
        rating: (target as any).rating || (target as any).userRating || (target as any).score,
        vibe: (target as any).vibe?.score || (target as any).vibe,
        vibe_label: (target as any).vibe?.label || (target as any).vibe_label,
        airing_status: (target as any).airing_status || (target as any).airingStatus,
        next_episode_date: (target as any).next_episode_date || (target as any).nextEpisodeDate,
        next_episode_number: (target as any).next_episode_number || (target as any).nextEpisodeNumber,
        watched_episodes: (target as any).watched_episodes || 0,
        updated_at: new Date().toISOString(),
      }
      updatedArchive = [newItem, ...archive]
      setArchive(updatedArchive)
      AsyncStorage.setItem(ARCHIVE_CACHE_KEY, JSON.stringify(updatedArchive)).catch(() => {})
      saveArchiveItem(newItem).catch(() => {})
    }
  }

  const refreshData = async () => {
    try {
      const [freshArchive, freshDiscover] = await Promise.all([
        fetchArchive(),
        fetchDiscover(),
      ])
      if (freshArchive && freshArchive.length > 0) {
        setArchive(freshArchive)
        await AsyncStorage.setItem(ARCHIVE_CACHE_KEY, JSON.stringify(freshArchive))
      }
      if (freshDiscover && freshDiscover.talkOfTheTown.length > 0) {
        setDiscoverData(freshDiscover)
        await AsyncStorage.setItem(DISCOVER_CACHE_KEY, JSON.stringify(freshDiscover))
      }
    } catch (err) {
      console.warn('[ArchiveContext] refresh error:', err)
    }
  }

  return (
    <ArchiveContext.Provider
      value={{
        archive,
        discoverData,
        isLoading,
        watchlist,
        watching,
        finished,
        alerts,
        updateDramaStatus,
        refreshData,
        getDramaStatus,
      }}
    >
      {children}
    </ArchiveContext.Provider>
  )
}

export function useArchive() {
  const ctx = useContext(ArchiveContext)
  if (!ctx) throw new Error('useArchive must be used within ArchiveProvider')
  return ctx
}
