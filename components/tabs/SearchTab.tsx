'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  Search, X, Bookmark, Play, CheckCircle, Loader2, Star,
  Plus, Compass, Sparkles,
} from 'lucide-react'
import type { Drama } from '@/lib/tmdb'
import { tmdbCard, tmdbThumb } from '@/lib/image-utils'
import {
  addDrama, moveDrama, removeDrama, getUserDramas,
  getSavedDramasSync, onArchiveSync, updateWatchedEpisodes,
  type DramaStatus, type UserDrama,
} from '@/lib/supabase/archive'
import { REGION_NAMES } from '@/components/drama/DramaDetailSheet'

interface SearchTabProps {
  onOpenDrama: (id: number, preview?: Drama) => void
  onOpenPerson: (id: number, name?: string) => void
  onTabChange?: (tab: 'search' | 'watchlist' | 'watching' | 'finished') => void
}

interface DiscoverRow { id: string; title: string; dramas: Drama[] }
interface DiscoverData { hero: Drama[]; rows: DiscoverRow[] }

const REGION_MOOD_FILTERS = [
  { id: 'All', label: 'All', region: 'ALL' },
  { id: 'KR', label: 'K-Drama', region: 'KR' },
  { id: 'CN', label: 'C-Drama', region: 'CN' },
  { id: 'JP', label: 'J-Drama', region: 'JP' },
  { id: 'Romance', label: 'Romance', region: 'ALL' },
  { id: 'Thriller', label: 'Thriller', region: 'ALL' },
  { id: 'Youth', label: 'Youth', region: 'ALL' },
]

export default function SearchTab({ onOpenDrama, onOpenPerson: _onOpenPerson, onTabChange }: SearchTabProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Drama[]>([])
  const [searching, setSearching] = useState(false)
  const [userDramas, setUserDramas] = useState<UserDrama[]>(() => getSavedDramasSync())
  const [discoverData, setDiscoverData] = useState<DiscoverData | null>(null)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const refreshUserDramas = useCallback(async () => {
    try {
      const data = await getUserDramas()
      if (Array.isArray(data)) setUserDramas(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    refreshUserDramas()
    const unsubscribe = onArchiveSync((allDramas) => setUserDramas(allDramas))
    return () => unsubscribe()
  }, [refreshUserDramas])

  // Load discover data
  const loadDiscover = useCallback(async (region: string) => {
    setDiscoverLoading(true)
    try {
      const res = await fetch(`/api/discover?region=${region}`)
      if (res.ok) {
        const data = await res.json()
        setDiscoverData(data)
      }
    } catch { /* ignore */ }
    setDiscoverLoading(false)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      const target = REGION_MOOD_FILTERS.find(f => f.id === activeFilter)?.region || 'ALL'
      loadDiscover(target)
    }
  }, [activeFilter, loadDiscover, query])

  useEffect(() => {
    if (query.trim()) return
    if (!discoverData) loadDiscover('ALL')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (res.ok) setResults(await res.json())
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) { setResults([]); return }
    timerRef.current = setTimeout(() => doSearch(query), 200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, doSearch])

  function quickAdd(drama: Drama, targetStatus: DramaStatus, e?: React.MouseEvent) {
    e?.stopPropagation()
    ;(document.activeElement as HTMLElement)?.blur()
    const currentSaved = userDramas.find(d => d.tmdb_id === drama.tmdbId)
    const currentStatus = currentSaved?.status
    if (currentStatus === targetStatus) removeDrama(drama.dramaId)
    else if (currentStatus) moveDrama(drama.dramaId, targetStatus)
    else addDrama({
      drama_id: drama.dramaId,
      tmdb_id: drama.tmdbId,
      title: drama.title,
      native_title: drama.nativeTitle || '',
      poster_url: drama.posterUrl,
      country: drama.country,
      release_year: drama.releaseYear,
      total_episodes: drama.totalEpisodes,
      rating: drama.rating,
      status: targetStatus,
      airing_status: drama.airingStatus,
      first_air_date: drama.firstAirDate || null,
      next_episode_date: drama.nextEpisodeDate,
      next_episode_number: drama.nextEpisodeNumber,
    })
  }

  function handleOpenDrama(drama: Drama) {
    ;(document.activeElement as HTMLElement)?.blur()
    onOpenDrama(drama.tmdbId, drama)
  }

  const showResults = query.trim().length > 0
  const watchlistDramas = userDramas.filter(d => d.status === 'watchlist')
  const watchingDramas = userDramas.filter(d => d.status === 'watching')
  const finishedDramas = userDramas.filter(d => d.status === 'finished')
  const activeWatching = watchingDramas[0] ?? null

  // Collect top editorial dramas (strictly excluding anime/animation)
  const allDiscoverDramas: Drama[] = []
  const seenIds = new Set<number>()

  if (discoverData?.hero) {
    for (const d of discoverData.hero) {
      if (!seenIds.has(d.tmdbId)) {
        seenIds.add(d.tmdbId)
        allDiscoverDramas.push(d)
      }
    }
  }

  if (discoverData?.rows) {
    for (const row of discoverData.rows) {
      for (const d of row.dramas) {
        if (!seenIds.has(d.tmdbId)) {
          seenIds.add(d.tmdbId)
          allDiscoverDramas.push(d)
        }
      }
    }
  }

  const spotlightDrama = allDiscoverDramas[0] ?? null
  const bentoGallery = allDiscoverDramas.slice(1, 15)

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* 1. EDITORIAL HEADER & INTEGRATED LIVE ACTIVITY GLASS DOCK */}
      <header className="px-5 pt-16 pb-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-none">
              Archive<span className="text-white/40 font-serif italic">.</span>
            </h1>
            <p className="text-xs text-white/50 font-medium mt-1">Spatial Collector&apos;s Vault</p>
          </div>

          {/* Floating Gaussian-Blurred iOS Live Activity Bar */}
          {activeWatching ? (
            <div
              onClick={() => onOpenDrama(activeWatching.tmdb_id, activeWatching as any)}
              className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-2xl border border-white/25 pl-1.5 pr-2.5 py-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_8px_20px_rgba(0,0,0,0.5)] cursor-pointer active:scale-95 transition-transform select-none"
            >
              <div className="relative h-7 w-7 rounded-full overflow-hidden border border-white/30 flex-shrink-0 bg-black/60">
                {activeWatching.poster_url ? (
                  <Image
                    src={activeWatching.poster_url.replace('/original/', '/w185/')}
                    alt={activeWatching.title}
                    fill
                    className="object-cover"
                    sizes="28px"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-white/30 text-[9px]">?</div>
                )}
              </div>
              <div className="flex flex-col min-w-0 pr-1 hidden sm:flex">
                <span className="text-[9px] font-bold text-white/45 uppercase tracking-wider leading-none">Watching</span>
                <span className="text-[11px] font-bold text-white truncate max-w-[100px] leading-tight">{activeWatching.title}</span>
              </div>
              <span className="rounded-full bg-white/[0.15] border border-white/25 px-2 py-0.5 text-[10px] font-extrabold text-white">
                EP {activeWatching.watched_episodes ?? activeWatching.next_episode_number ?? 1}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const cur = Number(activeWatching.watched_episodes ?? activeWatching.next_episode_number ?? 0)
                  updateWatchedEpisodes(activeWatching.drama_id, cur + 1)
                }}
                className="w-5 h-5 rounded-full bg-white/[0.22] hover:bg-white/[0.35] border border-white/35 flex items-center justify-center text-white active:scale-90 transition cursor-pointer"
                title="+1 Episode"
              >
                <Plus size={11} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-xl border border-white/15 px-3 py-1 text-xs text-white/45">
              <span>No drama active</span>
            </div>
          )}
        </div>

        {/* Live Count Inline Glass Ribbon */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <button
            onClick={() => onTabChange?.('watchlist')}
            className="flex items-center gap-1.5 rounded-full bg-black/35 backdrop-blur-2xl border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/[0.15] active:scale-95 transition cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
          >
            <Bookmark size={11} className="text-sky-300" />
            <span className="tabular-nums font-bold text-white">{watchlistDramas.length}</span>
            <span className="text-white/60">Watchlist</span>
          </button>
          <button
            onClick={() => onTabChange?.('watching')}
            className="flex items-center gap-1.5 rounded-full bg-black/35 backdrop-blur-2xl border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/[0.15] active:scale-95 transition cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
          >
            <Play size={11} className="text-amber-300" />
            <span className="tabular-nums font-bold text-white">{watchingDramas.length}</span>
            <span className="text-white/60">Watching</span>
          </button>
          <button
            onClick={() => onTabChange?.('finished')}
            className="flex items-center gap-1.5 rounded-full bg-black/35 backdrop-blur-2xl border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/[0.15] active:scale-95 transition cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
          >
            <CheckCircle size={11} className="text-emerald-300" />
            <span className="tabular-nums font-bold text-white">{finishedDramas.length}</span>
            <span className="text-white/60">Finished</span>
          </button>
        </div>
      </header>

      {/* 2. FLOATING iOS SPOTLIGHT SEARCH BAR */}
      <div className="sticky top-0 z-30 px-5 pt-2 pb-3 max-w-6xl mx-auto w-full">
        <div className="relative flex items-center rounded-full bg-black/40 backdrop-blur-3xl border border-white/25 px-4 py-3 gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_12px_32px_rgba(0,0,0,0.6)] transform-gpu">
          {searching ? (
            <Loader2 size={17} className="text-white/80 flex-shrink-0 animate-spin" />
          ) : (
            <Search size={17} className="text-white/45 flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Spotlight search dramas, actors, Chinese, Korean…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 bg-transparent text-sm font-medium text-white placeholder-white/35 outline-none tracking-tight touch-manipulation"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]) }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-white/70 hover:bg-white/25 transition active:scale-90 cursor-pointer touch-manipulation select-none"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── SEARCH RESULTS ─────────────────────────────────────── */}
      {showResults ? (
        <div className="relative z-10 flex-1 px-5 pb-36 max-w-6xl mx-auto w-full">
          {results.length === 0 && !searching && (
            <div className="flex w-full flex-col items-center justify-center py-20 px-6 gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/20 bg-black/40 backdrop-blur-2xl shadow-lg mb-1">
                <Search size={26} className="text-white/40" />
              </div>
              <p className="text-base font-semibold text-white/80 max-w-sm leading-snug">
                No East Asian dramas found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-white/40 max-w-xs">
                Try searching by English title, native title, or actor name.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4.5">
            {results.map((drama, idx) => {
              const saved = userDramas.find(d => d.tmdb_id === drama.tmdbId)
              const posterSrc = tmdbCard(drama.posterUrl)
              const regionBadge = drama.country ? REGION_NAMES[drama.country.toUpperCase()]?.badge || drama.country : null
              const year = drama.releaseYear ? String(drama.releaseYear) : ''

              return (
                <div
                  key={drama.dramaId}
                  onClick={() => handleOpenDrama(drama)}
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                  className="group relative aspect-[2/3] w-full overflow-hidden rounded-[26px] border border-white/[0.22] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.35)] transition-all duration-200 text-left touch-manipulation select-none active:scale-[0.98] transform-gpu ios-stagger-card cursor-pointer"
                >
                  {posterSrc ? (
                    <Image
                      src={posterSrc}
                      alt={drama.title}
                      fill
                      sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 20vw"
                      loading="lazy"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-black/70 text-white/25 text-xs">No Poster</div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute inset-x-2.5 top-2.5 z-10 flex items-center justify-between gap-1 pointer-events-none">
                    {regionBadge && (
                      <span className="rounded-full bg-black/45 backdrop-blur-xl border border-white/25 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">
                        {regionBadge}
                      </span>
                    )}
                    {drama.rating > 0 && (
                      <span className="flex items-center gap-0.5 rounded-full bg-black/45 backdrop-blur-xl border border-amber-400/35 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 shadow-md">
                        <Star size={9} className="fill-amber-300 text-amber-300" />
                        {drama.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Floating Gaussian-Blurred Frosted Glass Dock */}
                  <div className="absolute inset-x-2.5 bottom-2.5 z-10 rounded-[20px] bg-black/35 backdrop-blur-2xl border border-white/25 p-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_8px_24px_rgba(0,0,0,0.5)] flex flex-col gap-1.5">
                    <div className="flex flex-col min-w-0">
                      <h4 className="text-[12px] font-bold tracking-tight text-white line-clamp-1 leading-tight">{drama.title}</h4>
                      {year && <p className="text-[10px] font-medium text-white/60 truncate">{year}</p>}
                    </div>
                    {/* Quick Add Frosted White Glass Buttons */}
                    <div className="flex items-center gap-1 pt-1 border-t border-white/[0.14]" onClick={e => e.stopPropagation()}>
                      <button
                        title="Watchlist"
                        onClick={e => quickAdd(drama, 'watchlist', e)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-full border text-[10px] font-semibold active:scale-95 transition ${
                          saved?.status === 'watchlist'
                            ? 'bg-white/[0.30] border-white/50 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
                            : 'bg-white/[0.12] border-white/20 text-white/70 hover:bg-white/[0.20]'
                        }`}
                      >
                        <Bookmark size={10} fill={saved?.status === 'watchlist' ? 'currentColor' : 'none'} />
                        <span>Watchlist</span>
                      </button>
                      <button
                        title="Watching"
                        onClick={e => quickAdd(drama, 'watching', e)}
                        className={`flex items-center justify-center h-6 w-6 rounded-full border active:scale-90 transition ${
                          saved?.status === 'watching'
                            ? 'bg-white/[0.30] border-white/50 text-white'
                            : 'bg-white/[0.12] border-white/20 text-white/70 hover:bg-white/[0.20]'
                        }`}
                      >
                        <Play size={9} fill={saved?.status === 'watching' ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── DISCOVER HOME: iOS 18 BENTO GALLERY ─────────────────── */
        <div className="relative z-10 flex-1 px-5 pb-36 max-w-6xl mx-auto w-full">

          {/* 3. TACTILE FROSTED REGION / MOOD FILTER SWITCHER */}
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-5 px-5" style={{ WebkitOverflowScrolling: 'touch' }}>
            {REGION_MOOD_FILTERS.map(pill => {
              const isActive = activeFilter === pill.id
              return (
                <button
                  key={pill.id}
                  onClick={() => setActiveFilter(pill.id)}
                  className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold backdrop-blur-2xl transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation select-none ${
                    isActive
                      ? 'bg-white/[0.25] backdrop-blur-2xl border-white/40 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_16px_rgba(0,0,0,0.4)] font-bold'
                      : 'bg-black/30 border-white/18 text-white/70 hover:bg-white/[0.12] hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                  }`}
                >
                  {pill.label}
                </button>
              )
            })}
          </div>

          {discoverLoading && !discoverData ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white" />
            </div>
          ) : (
            <>
              {/* 4. ASYMMETRIC BENTO EDITORIAL LOOKBOOK GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4.5 mt-2">

                {/* #1 Large Bento Spotlight Card (col-span-2 row-span-2) */}
                {spotlightDrama && (
                  <div
                    onClick={() => handleOpenDrama(spotlightDrama)}
                    className="group relative col-span-2 row-span-2 aspect-[4/5] sm:aspect-square w-full overflow-hidden rounded-[32px] border border-white/[0.25] shadow-[0_24px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.35)] active:scale-[0.99] transition-transform duration-200 cursor-pointer transform-gpu"
                  >
                    {/* Full-bleed visual */}
                    {spotlightDrama.backdropUrl || spotlightDrama.posterUrl ? (
                      <Image
                        src={spotlightDrama.backdropUrl ? spotlightDrama.backdropUrl.replace('/original/', '/w1280/') : spotlightDrama.posterUrl}
                        alt={spotlightDrama.title}
                        fill
                        priority
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        sizes="(max-width: 768px) 100vw, 600px"
                      />
                    ) : (
                      <div className="h-full w-full bg-black/70" />
                    )}

                    {/* Gradient Dimmer */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute inset-x-3.5 top-3.5 z-10 flex items-center justify-between gap-1 pointer-events-none">
                      <span className="flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-xl border border-white/25 px-3 py-1 text-[11px] font-extrabold text-white shadow-md">
                        <Sparkles size={11} className="text-amber-300" />
                        <span>#01 Spotlight</span>
                      </span>

                      {spotlightDrama.country && REGION_NAMES[spotlightDrama.country] && (
                        <span className="rounded-full bg-black/45 backdrop-blur-xl border border-white/25 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                          {REGION_NAMES[spotlightDrama.country].badge}
                        </span>
                      )}
                    </div>

                    {/* Thick Gaussian-Blurred Frosted Glass Dock */}
                    <div className="absolute inset-x-3.5 bottom-3.5 z-10 rounded-[24px] bg-black/40 backdrop-blur-3xl border border-white/30 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_12px_36px_rgba(0,0,0,0.6)] flex flex-col gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {spotlightDrama.releaseYear > 0 && (
                            <span className="text-xs font-semibold text-white/60">{spotlightDrama.releaseYear}</span>
                          )}
                          {spotlightDrama.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-xs font-extrabold text-amber-300">
                              <Star size={11} className="fill-amber-300 text-amber-300" />
                              {spotlightDrama.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight line-clamp-1">
                          {spotlightDrama.title}
                        </h2>
                        {spotlightDrama.synopsis && (
                          <p className="text-xs text-white/70 line-clamp-2 mt-1 leading-relaxed hidden sm:block">
                            {spotlightDrama.synopsis}
                          </p>
                        )}
                      </div>

                      {/* 1-Tap Action Pills */}
                      <div className="flex items-center gap-2 pt-1 border-t border-white/[0.14]" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDrama(spotlightDrama)}
                          className="flex items-center gap-1.5 rounded-full bg-white text-black px-4 py-2 text-xs font-black active:scale-95 transition cursor-pointer select-none shadow-md"
                        >
                          <Compass size={13} strokeWidth={2.6} />
                          <span>Explore</span>
                        </button>
                        <button
                          onClick={e => quickAdd(spotlightDrama, 'watchlist', e)}
                          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold backdrop-blur-xl active:scale-95 transition cursor-pointer select-none ${
                            userDramas.find(d => d.tmdb_id === spotlightDrama.tmdbId)?.status === 'watchlist'
                              ? 'bg-white/[0.30] border-white/50 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
                              : 'bg-white/[0.12] border-white/20 text-white/80 hover:bg-white/[0.22]'
                          }`}
                        >
                          <Bookmark size={11} fill={userDramas.find(d => d.tmdb_id === spotlightDrama.tmdbId)?.status === 'watchlist' ? 'currentColor' : 'none'} />
                          <span>{userDramas.find(d => d.tmdb_id === spotlightDrama.tmdbId)?.status === 'watchlist' ? 'Saved' : '+ Watchlist'}</span>
                        </button>
                        <button
                          onClick={e => quickAdd(spotlightDrama, 'watching', e)}
                          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold backdrop-blur-xl active:scale-95 transition cursor-pointer select-none ${
                            userDramas.find(d => d.tmdb_id === spotlightDrama.tmdbId)?.status === 'watching'
                              ? 'bg-white/[0.30] border-white/50 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
                              : 'bg-white/[0.12] border-white/20 text-white/80 hover:bg-white/[0.22]'
                          }`}
                        >
                          <Play size={11} fill={userDramas.find(d => d.tmdb_id === spotlightDrama.tmdbId)?.status === 'watching' ? 'currentColor' : 'none'} />
                          <span>{userDramas.find(d => d.tmdb_id === spotlightDrama.tmdbId)?.status === 'watching' ? 'Watching' : '+ Watching'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Surrounding Bento Cards (#02 - #14) */}
                {bentoGallery.map((drama, idx) => {
                  const saved = userDramas.find(d => d.tmdb_id === drama.tmdbId)
                  const posterSrc = tmdbCard(drama.posterUrl)
                  const rankString = String(idx + 2).padStart(2, '0')
                  const regionBadge = drama.country ? REGION_NAMES[drama.country.toUpperCase()]?.badge || drama.country : null

                  return (
                    <div
                      key={drama.dramaId}
                      onClick={() => handleOpenDrama(drama)}
                      style={{ animationDelay: `${Math.min(idx * 35, 350)}ms` }}
                      className="group relative aspect-[2/3] w-full overflow-hidden rounded-[26px] border border-white/[0.22] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.35)] transition-all duration-200 text-left touch-manipulation select-none active:scale-[0.98] transform-gpu ios-stagger-card cursor-pointer"
                    >
                      {/* Full-bleed poster */}
                      {posterSrc ? (
                        <Image
                          src={posterSrc}
                          alt={drama.title}
                          fill
                          sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 22vw"
                          loading="lazy"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-black/70 text-white/25 text-xs font-medium">No Poster</div>
                      )}

                      {/* Top Rank + Badge */}
                      <div className="absolute inset-x-2.5 top-2.5 z-10 flex items-center justify-between gap-1 pointer-events-none">
                        <span className="rounded-full bg-black/45 backdrop-blur-xl border border-white/25 px-2 py-0.5 text-[10px] font-black text-white shadow-md">
                          #{rankString}
                        </span>

                        {drama.rating > 0 && (
                          <span className="flex items-center gap-0.5 rounded-full bg-black/45 backdrop-blur-xl border border-amber-400/35 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 shadow-md">
                            <Star size={9} className="fill-amber-300 text-amber-300" />
                            {drama.rating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      {/* Floating Gaussian-Blurred Frosted Glass Dock */}
                      <div className="absolute inset-x-2.5 bottom-2.5 z-10 rounded-[20px] bg-black/35 backdrop-blur-2xl border border-white/25 p-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_8px_24px_rgba(0,0,0,0.5)] flex flex-col gap-1.5">
                        <div className="flex flex-col min-w-0">
                          <h4 className="text-[12px] font-bold tracking-tight text-white line-clamp-1 leading-tight group-hover:text-white/90">
                            {drama.title}
                          </h4>
                          <p className="text-[10px] font-medium text-white/60 truncate mt-0.5">
                            {[regionBadge, drama.releaseYear > 0 ? String(drama.releaseYear) : null].filter(Boolean).join(' • ')}
                          </p>
                        </div>

                        {/* 1-Tap Frosted White Glass Quick Actions */}
                        <div className="flex items-center gap-1 pt-1 border-t border-white/[0.14]" onClick={e => e.stopPropagation()}>
                          <button
                            title="Watchlist"
                            onClick={e => quickAdd(drama, 'watchlist', e)}
                            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-full border text-[10px] font-semibold active:scale-95 transition ${
                              saved?.status === 'watchlist'
                                ? 'bg-white/[0.30] border-white/50 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
                                : 'bg-white/[0.12] border-white/20 text-white/70 hover:bg-white/[0.20]'
                            }`}
                          >
                            <Bookmark size={10} fill={saved?.status === 'watchlist' ? 'currentColor' : 'none'} />
                            <span>Watchlist</span>
                          </button>
                          <button
                            title="Watching"
                            onClick={e => quickAdd(drama, 'watching', e)}
                            className={`flex items-center justify-center h-6 w-6 rounded-full border active:scale-90 transition ${
                              saved?.status === 'watching'
                                ? 'bg-white/[0.30] border-white/50 text-white'
                                : 'bg-white/[0.12] border-white/20 text-white/70 hover:bg-white/[0.20]'
                            }`}
                          >
                            <Play size={9} fill={saved?.status === 'watching' ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            title="Finished"
                            onClick={e => quickAdd(drama, 'finished', e)}
                            className={`flex items-center justify-center h-6 w-6 rounded-full border active:scale-90 transition ${
                              saved?.status === 'finished'
                                ? 'bg-white/[0.30] border-white/50 text-white'
                                : 'bg-white/[0.12] border-white/20 text-white/70 hover:bg-white/[0.20]'
                            }`}
                          >
                            <CheckCircle size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

        </div>
      )}
    </div>
  )
}
