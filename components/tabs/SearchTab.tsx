'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import {
  Search, X, Bookmark, Play, CheckCircle, Loader2, Star,
  Compass, Sparkles, SlidersHorizontal,
} from 'lucide-react'
import type { Drama } from '@/lib/tmdb'
import { tmdbCard } from '@/lib/image-utils'
import {
  addDrama, moveDrama, removeDrama, getUserDramas,
  getSavedDramasSync, onArchiveSync,
  type DramaStatus, type UserDrama,
} from '@/lib/supabase/archive'
import { REGION_NAMES } from '@/components/drama/DramaDetailSheet'
import MovingPosterWall from '@/components/wall/MovingPosterWall'
import VibeChart, { DEFAULT_VIBES } from '@/components/vibe/VibeChart'

interface SearchTabProps {
  onOpenDrama: (id: number, preview?: Drama) => void
  onOpenPerson: (id: number, name?: string) => void
  onTabChange?: (tab: 'search' | 'watchlist' | 'watching' | 'finished') => void
}

interface DiscoverRow { id: string; title: string; dramas: Drama[] }
interface DiscoverData { hero: Drama[]; rows: DiscoverRow[] }

function matchesVibe(drama: Drama, vibeName: string | null): boolean {
  if (!vibeName) return true
  const text = `${(drama.genres || []).join(' ')} ${(drama.tags || []).join(' ')} ${drama.synopsis || ''}`.toLowerCase()
  const lower = vibeName.toLowerCase()
  if (lower.includes('romance')) {
    return text.includes('romance') || text.includes('love') || text.includes('romantic') || text.includes('couple') || text.includes('dating')
  }
  if (lower.includes('melo') || lower.includes('drama')) {
    return text.includes('drama') || text.includes('melodrama') || text.includes('tragedy') || text.includes('family') || text.includes('tears')
  }
  if (lower.includes('thrill') || lower.includes('crime')) {
    return text.includes('crime') || text.includes('mystery') || text.includes('thriller') || text.includes('revenge') || text.includes('dark') || text.includes('suspense') || text.includes('investigation')
  }
  if (lower.includes('youth')) {
    return text.includes('youth') || text.includes('school') || text.includes('college') || text.includes('student') || text.includes('teen')
  }
  if (lower.includes('fant') || lower.includes('wuxia')) {
    return text.includes('fantasy') || text.includes('action') || text.includes('adventure') || text.includes('costume') || text.includes('historical') || text.includes('wuxia') || text.includes('xianxia') || text.includes('martial')
  }
  if (lower.includes('hist')) {
    return text.includes('historical') || text.includes('period') || text.includes('costume') || text.includes('dynasty') || text.includes('palace')
  }
  return text.includes(lower)
}

export default function SearchTab({ onOpenDrama, onOpenPerson: _onOpenPerson, onTabChange }: SearchTabProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Drama[]>([])
  const [searching, setSearching] = useState(false)
  const [userDramas, setUserDramas] = useState<UserDrama[]>(() => getSavedDramasSync())
  const [discoverData, setDiscoverData] = useState<DiscoverData | null>(null)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null)

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

  // Load discover data once
  const loadDiscover = useCallback(async () => {
    setDiscoverLoading(true)
    try {
      const res = await fetch('/api/discover?region=ALL')
      if (res.ok) {
        const data = await res.json()
        setDiscoverData(data)
      }
    } catch { /* ignore */ }
    setDiscoverLoading(false)
  }, [])

  useEffect(() => {
    if (!discoverData) loadDiscover()
  }, [discoverData, loadDiscover])

  // Search logic
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

  // Collect top editorial dramas
  const allDiscoverDramas: Drama[] = useMemo(() => {
    const list: Drama[] = []
    const seen = new Set<number>()
    if (discoverData?.hero) {
      for (const d of discoverData.hero) {
        if (!seen.has(d.tmdbId)) {
          seen.add(d.tmdbId)
          list.push(d)
        }
      }
    }
    if (discoverData?.rows) {
      for (const row of discoverData.rows) {
        for (const d of row.dramas) {
          if (!seen.has(d.tmdbId)) {
            seen.add(d.tmdbId)
            list.push(d)
          }
        }
      }
    }
    return list
  }, [discoverData])

  // Filtered dramas based on selected vibe
  const filteredDramas = useMemo(() => {
    if (!selectedVibe) return allDiscoverDramas
    return allDiscoverDramas.filter(d => matchesVibe(d, selectedVibe))
  }, [allDiscoverDramas, selectedVibe])

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* 1. CLEAN EDITORIAL HEADER */}
      <header className="px-5 pt-14 pb-3 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-[#c24816] via-[#c80815] to-[#ff4069] text-white shadow-sm">
                <Compass size={13} />
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-none">
                Explore<span className="text-[#c80815] font-serif italic">.</span>
              </h1>
            </div>
            <p className="text-xs text-white/50 font-medium mt-1.5">
              Subho&apos;s Drama Archive · Spatial Taste Club
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onTabChange?.('watchlist')}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/[0.14] active:scale-95 transition cursor-pointer"
            >
              <Bookmark size={12} className="text-sky-400" />
              <span className="font-bold text-white">{watchlistDramas.length}</span>
            </button>
            <button
              onClick={() => onTabChange?.('watching')}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/[0.14] active:scale-95 transition cursor-pointer"
            >
              <Play size={12} className="text-purple-400" />
              <span className="font-bold text-white">{watchingDramas.length}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. FLOATING iOS SPOTLIGHT SEARCH BAR */}
      <div className="sticky top-0 z-30 px-5 pt-2 pb-3 max-w-6xl mx-auto w-full">
        <div className="relative flex items-center rounded-full bg-black/50 backdrop-blur-3xl border border-white/20 px-4 py-3 gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_12px_32px_rgba(0,0,0,0.6)] transform-gpu">
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
            placeholder="Search East Asian dramas, actors, Chinese, Korean…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 bg-transparent text-sm font-medium text-white placeholder-white/40 outline-none tracking-tight touch-manipulation"
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

                  {/* Floating Frosted Glass Dock */}
                  <div className="absolute inset-x-2.5 bottom-2.5 z-10 rounded-[20px] bg-black/40 backdrop-blur-2xl border border-white/25 p-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_8px_24px_rgba(0,0,0,0.5)] flex flex-col gap-1.5">
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
        /* ── MOCTALE EXPLORE & TASTE CLUB SHOWCASE ─────────────────── */
        <div className="relative z-10 flex-1 px-5 pb-36 max-w-6xl mx-auto w-full">

          {/* 3. SHOWCASE DUAL BENTO CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-2">
            
            {/* Card A: 3-Column Moving Poster Wall */}
            <div className="relative overflow-hidden rounded-[32px] border border-white/[0.18] bg-black/40 backdrop-blur-2xl shadow-2xl h-[460px] flex flex-col justify-between">
              {/* Hardware-accelerated moving columns */}
              <div className="absolute inset-0">
                <MovingPosterWall
                  dramas={allDiscoverDramas}
                  onPosterClick={(id, preview) => {
                    const matched = allDiscoverDramas.find(d => d.tmdbId === id)
                    handleOpenDrama(matched || (preview as Drama) || ({ tmdbId: id, dramaId: id, title: '' } as any))
                  }}
                  className="h-full w-full"
                />
              </div>

              {/* Top glass pill */}
              <div className="relative z-10 pointer-events-none p-4 flex items-center justify-between">
                <span className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 px-3 py-1 text-[11px] font-bold text-white shadow-md">
                  <Sparkles size={11} className="text-amber-400" />
                  Trending Live Wall
                </span>
                <span className="text-[10px] text-white/60 font-semibold rounded-full bg-black/40 backdrop-blur-md px-2.5 py-0.5 border border-white/10">
                  Tap Any Poster
                </span>
              </div>

              {/* Bottom glass dock */}
              <div className="relative z-10 pointer-events-none p-4">
                <div className="rounded-[20px] bg-black/65 backdrop-blur-xl border border-white/15 p-3 flex items-center justify-between shadow-lg">
                  <div>
                    <p className="text-xs font-bold text-white">East Asian Showcase</p>
                    <p className="text-[10px] text-white/50">Continuous 60fps Marquee</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-white/80 rounded-full bg-white/10 px-2.5 py-1">
                    Live Feed
                  </span>
                </div>
              </div>
            </div>

            {/* Card B: Subho's Personal Archive Vibe Chart */}
            <div className="rounded-[32px] border border-white/[0.18] bg-black/40 backdrop-blur-2xl shadow-2xl p-6 flex flex-col justify-between min-h-[460px]">
              <VibeChart
                savedDramas={userDramas}
                title="Subho's Taste Profile"
                subtitle="Dynamic Persona from Your Collection"
                selectedVibe={selectedVibe}
                onSelectVibe={(v) => setSelectedVibe(prev => prev === v ? null : v)}
              />

              {selectedVibe && (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/[0.08] border border-white/15 px-3.5 py-2">
                  <span className="text-xs text-white/80 font-medium">Filtering by: <b className="text-white">{selectedVibe}</b></span>
                  <button
                    onClick={() => setSelectedVibe(null)}
                    className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                  >
                    Reset Filter
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* 4. EXPLORE BY VIBE SELECTOR PILLS */}
          <div className="mt-10 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-white/50" />
              <h2 className="text-base font-bold tracking-tight text-white">
                {selectedVibe ? `${selectedVibe} Dramas` : 'Curated East Asian Dramas'}
              </h2>
              <span className="text-xs text-white/40 font-medium">({filteredDramas.length})</span>
            </div>
            {selectedVibe && (
              <button
                onClick={() => setSelectedVibe(null)}
                className="text-xs font-semibold text-white/60 hover:text-white transition cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Vibe Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-5 px-5" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setSelectedVibe(null)}
              className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold backdrop-blur-2xl transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation select-none ${
                selectedVibe === null
                  ? 'bg-white/[0.25] border-white/40 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_16px_rgba(0,0,0,0.4)] font-bold'
                  : 'bg-black/30 border-white/18 text-white/70 hover:bg-white/[0.12] hover:text-white'
              }`}
            >
              All Vibes
            </button>
            {DEFAULT_VIBES.map(v => {
              const isActive = selectedVibe === v.name
              return (
                <button
                  key={v.name}
                  onClick={() => setSelectedVibe(prev => prev === v.name ? null : v.name)}
                  className={`flex-shrink-0 flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold backdrop-blur-2xl transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation select-none ${
                    isActive
                      ? 'bg-white/[0.25] border-white/40 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_16px_rgba(0,0,0,0.4)] font-bold'
                      : 'bg-black/30 border-white/18 text-white/70 hover:bg-white/[0.12] hover:text-white'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: v.color }} />
                  <span>{v.name}</span>
                </button>
              )
            })}
          </div>

          {/* 5. CURATED DRAMA POSTER GALLERY */}
          {discoverLoading && allDiscoverDramas.length === 0 ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4.5 mt-2">
              {filteredDramas.map((drama, idx) => {
                const saved = userDramas.find(d => d.tmdb_id === drama.tmdbId)
                const posterSrc = tmdbCard(drama.posterUrl)
                const regionBadge = drama.country ? REGION_NAMES[drama.country.toUpperCase()]?.badge || drama.country : null

                return (
                  <div
                    key={drama.dramaId}
                    onClick={() => handleOpenDrama(drama)}
                    style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                    className="group relative aspect-[2/3] w-full overflow-hidden rounded-[26px] border border-white/[0.22] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.35)] transition-all duration-200 text-left touch-manipulation select-none active:scale-[0.98] transform-gpu ios-stagger-card cursor-pointer"
                  >
                    {/* Full-bleed poster */}
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
                      <div className="flex h-full w-full items-center justify-center bg-black/70 text-white/25 text-xs font-medium">No Poster</div>
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

                    {/* Floating Frosted Glass Dock */}
                    <div className="absolute inset-x-2.5 bottom-2.5 z-10 rounded-[20px] bg-black/40 backdrop-blur-2xl border border-white/25 p-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_8px_24px_rgba(0,0,0,0.5)] flex flex-col gap-1.5">
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
          )}

        </div>
      )}
    </div>
  )
}
