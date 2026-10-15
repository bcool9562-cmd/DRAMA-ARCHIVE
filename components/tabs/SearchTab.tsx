'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  Search, X, Bookmark, Play, CheckCircle, Loader2, Star,
  Plus, ChevronLeft, ChevronRight, Sparkles, Film, Compass,
} from 'lucide-react'
import type { Drama } from '@/lib/tmdb'
import { tmdbThumb } from '@/lib/image-utils'
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

const MOOD_REGION_PILLS = [
  { id: 'All', label: 'All', type: 'all' },
  { id: 'KR', label: 'K-Drama', type: 'region' },
  { id: 'CN', label: 'C-Drama', type: 'region' },
  { id: 'JP', label: 'J-Drama', type: 'region' },
  { id: 'Romance', label: 'Romance', type: 'mood' },
  { id: 'Dark / Thriller', label: 'Dark / Thriller', type: 'mood' },
  { id: 'Fantasy', label: 'Fantasy', type: 'mood' },
  { id: 'Youth', label: 'Youth', type: 'mood' },
]

export default function SearchTab({ onOpenDrama, onOpenPerson: _onOpenPerson, onTabChange }: SearchTabProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Drama[]>([])
  const [searching, setSearching] = useState(false)
  const [userDramas, setUserDramas] = useState<UserDrama[]>(() => getSavedDramasSync())
  const [discoverData, setDiscoverData] = useState<DiscoverData | null>(null)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [activePill, setActivePill] = useState('All')
  const [deckIndex, setDeckIndex] = useState(0)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const deckTimer = useRef<ReturnType<typeof setInterval> | null>(null)

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
        setDeckIndex(0)
      }
    } catch { /* ignore */ }
    setDiscoverLoading(false)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      const regionParam = ['KR', 'CN', 'JP'].includes(activePill) ? activePill : 'ALL'
      loadDiscover(regionParam)
    }
  }, [activePill, loadDiscover, query])

  useEffect(() => {
    if (query.trim()) return
    if (!discoverData) loadDiscover('ALL')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-rotate 3D deck every 5 seconds if not interacting
  useEffect(() => {
    if (!discoverData?.hero?.length) return
    deckTimer.current = setInterval(() => {
      setDeckIndex(i => (i + 1) % Math.min(5, discoverData.hero.length))
    }, 5500)
    return () => { if (deckTimer.current) clearInterval(deckTimer.current) }
  }, [discoverData?.hero?.length])

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

  const heroList = (discoverData?.hero ?? []).slice(0, 5)
  const activeDeckDrama = heroList[deckIndex]

  // Top 10 dramas for Editorial Bento Grid
  const top10Dramas = (
    discoverData?.rows?.find(r => r.id === 'trending')?.dramas ??
    discoverData?.hero ??
    []
  ).slice(0, 10)

  // Filter rows
  const visibleRows = discoverData?.rows?.filter(row => {
    if (row.id === 'trending') return false // Handled in Top 10 Bento Grid
    if (activePill === 'All') return true
    if (activePill === 'KR') return row.id === 'kr' || row.id === 'top'
    if (activePill === 'CN') return row.id === 'cn' || row.id === 'top'
    if (activePill === 'JP') return row.id === 'jp' || row.id === 'top'
    return true
  }) ?? []

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Ambient radial background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(147,51,234,0.15),_transparent_70%)]" />
      </div>

      {/* Sticky Search Bar */}
      <div
        className="sticky top-0 z-30 px-4 pt-14 pb-3 max-w-3xl mx-auto w-full backdrop-blur-2xl bg-black/60"
      >
        <div className="relative flex items-center rounded-2xl border border-white/[0.18] bg-white/[0.08] px-4 py-3 gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_24px_rgba(0,0,0,0.6)] transform-gpu">
          {searching ? (
            <Loader2 size={18} className="text-purple-400 flex-shrink-0 animate-spin" />
          ) : (
            <Search size={18} className="text-white/45 flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search K-Drama, C-Drama, J-Drama, actors…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 bg-transparent text-sm font-medium text-white placeholder-white/35 outline-none tracking-tight touch-manipulation"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]) }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/20 transition active:scale-90 cursor-pointer touch-manipulation select-none"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── SEARCH RESULTS ─────────────────────────────────────── */}
      {showResults ? (
        <div className="relative z-10 flex-1 px-4 pb-36 max-w-4xl mx-auto w-full">
          {results.length === 0 && !searching && (
            <div className="flex w-full flex-col items-center justify-center py-20 px-6 gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-lg mb-1">
                <Search size={28} className="text-white/30" />
              </div>
              <p className="text-base font-semibold text-white/70 max-w-sm leading-snug">
                No East Asian dramas found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-white/40 max-w-xs">
                Try searching by English title, native title, or actor name.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {results.map((drama) => {
              const userSaved = userDramas.find(d => d.tmdb_id === drama.tmdbId)
              return (
                <SearchResultCard
                  key={drama.dramaId}
                  drama={drama}
                  savedStatus={userSaved?.status}
                  onOpen={() => handleOpenDrama(drama)}
                  onQuickAdd={(status, e) => quickAdd(drama, status, e)}
                />
              )
            })}
          </div>
        </div>
      ) : (
        /* ── DISCOVER HOME: SUBHO'S ARCHIVE VAULT & 3D DECK ─────── */
        <div className="relative z-10 flex-1 pb-36">

          {/* 1. SUBHO'S PERSONAL VAULT BENTO ROW */}
          <div className="px-4 mb-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Live "Now Watching" Glass Bento Card */}
              <div className="md:col-span-2 relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/[0.18] p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_12px_32px_rgba(0,0,0,0.5)] flex flex-col justify-between overflow-hidden transform-gpu">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      <Play size={11} className="fill-purple-400 ml-0.5" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-white/80">Subho&apos;s Active Vault</span>
                  </div>
                  {activeWatching && (
                    <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/15 border border-purple-400/20 px-2.5 py-0.5 rounded-full">
                      Now Watching
                    </span>
                  )}
                </div>

                {activeWatching ? (
                  <div className="flex gap-3.5 items-center">
                    <button
                      onClick={() => onOpenDrama(activeWatching.tmdb_id, activeWatching as any)}
                      className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-white/[0.18] bg-black/60 shadow-md active:scale-95 transition-transform duration-150 cursor-pointer touch-manipulation"
                    >
                      {activeWatching.poster_url ? (
                        <Image
                          src={activeWatching.poster_url.replace('/original/', '/w185/')}
                          alt={activeWatching.title}
                          fill
                          className="object-cover"
                          sizes="60px"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-white/20 text-[10px]">?</div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4
                        onClick={() => onOpenDrama(activeWatching.tmdb_id, activeWatching as any)}
                        className="text-sm font-bold text-white tracking-tight truncate cursor-pointer hover:underline"
                      >
                        {activeWatching.title}
                      </h4>
                      <p className="text-xs text-white/50 mt-0.5">
                        Episode {activeWatching.watched_episodes ?? activeWatching.next_episode_number ?? 0}
                        {activeWatching.total_episodes ? ` / ${activeWatching.total_episodes}` : ''}
                      </p>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 w-full rounded-full bg-black/40 overflow-hidden border border-white/[0.08]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all duration-300"
                          style={{
                            width: activeWatching.total_episodes
                              ? `${Math.min(100, Math.round(((activeWatching.watched_episodes ?? activeWatching.next_episode_number ?? 0) / activeWatching.total_episodes) * 100))}%`
                              : '40%'
                          }}
                        />
                      </div>
                    </div>
                    {/* Stepper +1 Ep button */}
                    <button
                      onClick={() => {
                        const cur = Number(activeWatching.watched_episodes ?? activeWatching.next_episode_number ?? 0)
                        updateWatchedEpisodes(activeWatching.drama_id, cur + 1)
                      }}
                      className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-purple-500/30 hover:bg-purple-500/50 border border-purple-400/40 px-3 py-2 text-xs font-bold text-white shadow-md active:scale-95 transition cursor-pointer touch-manipulation select-none"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span>+1 Ep</span>
                    </button>
                  </div>
                ) : (
                  <div className="py-2 text-center text-xs text-white/45">
                    No active drama right now. Tap &ldquo;Watching&rdquo; on any drama to track episodes here.
                  </div>
                )}
              </div>

              {/* 3 Interactive Vault Counter Tiles */}
              <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
                {/* Watchlist Tile */}
                <button
                  onClick={() => onTabChange?.('watchlist')}
                  className="flex flex-col items-center justify-center p-3 rounded-[22px] bg-white/[0.08] backdrop-blur-xl border border-white/[0.18] shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.4)] hover:bg-white/[0.12] active:scale-95 transition-all duration-150 cursor-pointer touch-manipulation select-none group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 mb-1 group-hover:scale-110 transition-transform">
                    <Bookmark size={13} className="fill-sky-400" />
                  </div>
                  <span className="text-base font-extrabold text-white tabular-nums">{watchlistDramas.length}</span>
                  <span className="text-[10px] font-semibold text-white/50 tracking-tight">Watchlist</span>
                </button>

                {/* Watching Tile */}
                <button
                  onClick={() => onTabChange?.('watching')}
                  className="flex flex-col items-center justify-center p-3 rounded-[22px] bg-white/[0.08] backdrop-blur-xl border border-white/[0.18] shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.4)] hover:bg-white/[0.12] active:scale-95 transition-all duration-150 cursor-pointer touch-manipulation select-none group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 mb-1 group-hover:scale-110 transition-transform">
                    <Play size={13} className="fill-purple-400 ml-0.5" />
                  </div>
                  <span className="text-base font-extrabold text-white tabular-nums">{watchingDramas.length}</span>
                  <span className="text-[10px] font-semibold text-white/50 tracking-tight">Watching</span>
                </button>

                {/* Finished Tile */}
                <button
                  onClick={() => onTabChange?.('finished')}
                  className="flex flex-col items-center justify-center p-3 rounded-[22px] bg-white/[0.08] backdrop-blur-xl border border-white/[0.18] shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.4)] hover:bg-white/[0.12] active:scale-95 transition-all duration-150 cursor-pointer touch-manipulation select-none group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-1 group-hover:scale-110 transition-transform">
                    <CheckCircle size={13} className="text-emerald-400" />
                  </div>
                  <span className="text-base font-extrabold text-white tabular-nums">{finishedDramas.length}</span>
                  <span className="text-[10px] font-semibold text-white/50 tracking-tight">Finished</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. INTERACTIVE 3D FANNED POSTER DECK */}
          {activeDeckDrama && (
            <div className="px-4 mb-7 max-w-4xl mx-auto">
              <div className="relative overflow-hidden rounded-[30px] border border-white/[0.18] bg-[#12121a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_20px_50px_rgba(0,0,0,0.8)] aspect-[16/10] sm:aspect-[21/9] max-h-[340px] transform-gpu">
                {/* Backdrop Visuals with Fading */}
                {heroList.map((drama, idx) => (
                  <div
                    key={drama.tmdbId}
                    className="absolute inset-0 transition-opacity duration-700"
                    style={{ opacity: idx === deckIndex ? 1 : 0 }}
                  >
                    {drama.backdropUrl ? (
                      <Image
                        src={drama.backdropUrl.replace('/original/', '/w1280/')}
                        alt={drama.title}
                        fill
                        priority={idx === 0}
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 900px"
                      />
                    ) : (
                      <div className="h-full w-full bg-[#181824]" />
                    )}
                  </div>
                ))}

                {/* Dark Glass Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />

                {/* Left/Right Deck Arrows */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
                  <button
                    onClick={() => setDeckIndex(i => (i - 1 + heroList.length) % heroList.length)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.10] backdrop-blur-md border border-white/[0.20] text-white hover:bg-white/[0.20] active:scale-90 transition cursor-pointer touch-manipulation"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setDeckIndex(i => (i + 1) % heroList.length)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.10] backdrop-blur-md border border-white/[0.20] text-white hover:bg-white/[0.20] active:scale-90 transition cursor-pointer touch-manipulation"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Deck Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 z-10">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      <Sparkles size={10} className="text-amber-300" />
                      Featured #{deckIndex + 1}
                    </span>
                    {activeDeckDrama.country && REGION_NAMES[activeDeckDrama.country] && (
                      <span className="rounded-full bg-white/15 backdrop-blur-md border border-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white">
                        {REGION_NAMES[activeDeckDrama.country].badge}
                      </span>
                    )}
                    {activeDeckDrama.rating > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/25 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                        <Star size={9} className="fill-amber-300" />{activeDeckDrama.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight mb-1.5 max-w-lg line-clamp-1">
                    {activeDeckDrama.title}
                  </h2>
                  {activeDeckDrama.synopsis && (
                    <p className="text-xs text-white/70 line-clamp-2 mb-3.5 leading-relaxed max-w-md hidden sm:block">
                      {activeDeckDrama.synopsis}
                    </p>
                  )}

                  {/* 1-tap Watchlist, Watching, and Explore Pills */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleOpenDrama(activeDeckDrama)}
                      className="flex items-center gap-1.5 rounded-full bg-white text-black px-4 py-2 text-xs font-extrabold active:scale-95 transition-transform duration-150 cursor-pointer touch-manipulation select-none shadow-lg"
                    >
                      <Compass size={13} strokeWidth={2.5} />
                      <span>Explore</span>
                    </button>
                    <button
                      onClick={e => quickAdd(activeDeckDrama, 'watchlist', e)}
                      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold backdrop-blur-md active:scale-95 transition-all duration-150 cursor-pointer touch-manipulation select-none ${
                        userDramas.find(d => d.tmdb_id === activeDeckDrama.tmdbId)?.status === 'watchlist'
                          ? 'bg-sky-500/35 border-sky-400/50 text-sky-200'
                          : 'bg-white/[0.12] border-white/[0.22] text-white hover:bg-white/[0.18]'
                      }`}
                    >
                      <Bookmark size={12} fill={userDramas.find(d => d.tmdb_id === activeDeckDrama.tmdbId)?.status === 'watchlist' ? 'currentColor' : 'none'} />
                      <span>{userDramas.find(d => d.tmdb_id === activeDeckDrama.tmdbId)?.status === 'watchlist' ? 'Saved' : '+ Watchlist'}</span>
                    </button>
                    <button
                      onClick={e => quickAdd(activeDeckDrama, 'watching', e)}
                      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold backdrop-blur-md active:scale-95 transition-all duration-150 cursor-pointer touch-manipulation select-none ${
                        userDramas.find(d => d.tmdb_id === activeDeckDrama.tmdbId)?.status === 'watching'
                          ? 'bg-purple-500/35 border-purple-400/50 text-purple-200'
                          : 'bg-white/[0.12] border-white/[0.22] text-white hover:bg-white/[0.18]'
                      }`}
                    >
                      <Play size={11} fill={userDramas.find(d => d.tmdb_id === activeDeckDrama.tmdbId)?.status === 'watching' ? 'currentColor' : 'none'} />
                      <span>{userDramas.find(d => d.tmdb_id === activeDeckDrama.tmdbId)?.status === 'watching' ? 'Watching' : '+ Watching'}</span>
                    </button>
                  </div>
                </div>

                {/* Deck Dots */}
                <div className="absolute bottom-3 right-5 flex items-center gap-1 z-20">
                  {heroList.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setDeckIndex(idx)}
                      className={`rounded-full transition-all duration-200 cursor-pointer touch-manipulation ${
                        idx === deckIndex ? 'bg-white w-5 h-1.5' : 'bg-white/35 w-1.5 h-1.5'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. MOOD & REGION GLASS ORBIT PILLS */}
          <div className="px-4 mb-7 max-w-5xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {MOOD_REGION_PILLS.map(pill => {
                const isActive = activePill === pill.id
                return (
                  <button
                    key={pill.id}
                    onClick={() => setActivePill(pill.id)}
                    className={`flex-shrink-0 rounded-full border px-4 py-2 text-xs font-semibold backdrop-blur-xl transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation select-none ${
                      isActive
                        ? 'bg-white text-black border-white shadow-[0_4px_16px_rgba(255,255,255,0.3)] font-bold'
                        : 'bg-white/[0.08] border-white/[0.16] text-white/70 hover:bg-white/[0.14] hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)]'
                    }`}
                  >
                    {pill.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 4. TOP 10 EDITORIAL BENTO GRID WITH TRANSLUCENT RANK NUMBERS */}
          {top10Dramas.length > 0 && (
            <div className="px-4 mb-9 max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <Film size={16} className="text-purple-400" />
                  <h3 className="text-base font-extrabold tracking-tight text-white">Top 10 Spotlight</h3>
                </div>
                <span className="text-xs font-semibold text-white/40">Editorial Pick</span>
              </div>
              <div className="flex gap-3.5 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                {top10Dramas.map((drama, idx) => {
                  const saved = userDramas.find(d => d.tmdb_id === drama.tmdbId)
                  const rankString = String(idx + 1).padStart(2, '0')
                  return (
                    <div key={drama.dramaId} className="flex-shrink-0 w-32 sm:w-36 flex flex-col gap-2">
                      <button
                        onClick={() => handleOpenDrama(drama)}
                        className="group relative aspect-[2/3] w-full overflow-hidden rounded-[22px] bg-[#161622] border border-white/[0.16] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_28px_rgba(0,0,0,0.5)] active:scale-95 transition-transform duration-150 cursor-pointer touch-manipulation"
                      >
                        {drama.posterUrl ? (
                          <Image
                            src={drama.posterUrl.replace('/original/', '/w342/')}
                            alt={drama.title}
                            fill
                            loading={idx < 4 ? 'eager' : 'lazy'}
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="144px"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-white/20 text-xs">?</div>
                        )}
                        {/* Big translucent glass rank numeral */}
                        <div className="absolute -bottom-2 -left-1 pointer-events-none select-none">
                          <span
                            className="text-[44px] font-black text-white/90 leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]"
                            style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.35)' }}
                          >
                            {rankString}
                          </span>
                        </div>
                        {drama.rating > 0 && (
                          <div className="absolute top-2 right-2">
                            <span className="flex items-center gap-0.5 rounded-full bg-black/60 backdrop-blur-md border border-amber-400/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                              <Star size={8} className="fill-amber-300" />{drama.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </button>
                      <p className="text-xs font-bold text-white/85 line-clamp-1 leading-tight px-0.5">{drama.title}</p>
                      {/* Action buttons */}
                      <div className="flex items-center gap-1 px-0.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => quickAdd(drama, 'watchlist', e)}
                          className={`flex items-center justify-center h-6 w-6 rounded-full border transition-all active:scale-90 cursor-pointer touch-manipulation ${
                            saved?.status === 'watchlist' ? 'bg-sky-500/35 border-sky-400/50 text-sky-200' : 'bg-white/[0.08] border-white/[0.14] text-white/50'
                          }`}
                        >
                          <Bookmark size={10} fill={saved?.status === 'watchlist' ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={e => quickAdd(drama, 'watching', e)}
                          className={`flex items-center justify-center h-6 w-6 rounded-full border transition-all active:scale-90 cursor-pointer touch-manipulation ${
                            saved?.status === 'watching' ? 'bg-purple-500/35 border-purple-400/50 text-purple-200' : 'bg-white/[0.08] border-white/[0.14] text-white/50'
                          }`}
                        >
                          <Play size={9} fill={saved?.status === 'watching' ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={e => quickAdd(drama, 'finished', e)}
                          className={`flex items-center justify-center h-6 w-6 rounded-full border transition-all active:scale-90 cursor-pointer touch-manipulation ${
                            saved?.status === 'finished' ? 'bg-emerald-500/35 border-emerald-400/50 text-emerald-200' : 'bg-white/[0.08] border-white/[0.14] text-white/50'
                          }`}
                        >
                          <CheckCircle size={10} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 5. SWIMLANE ROWS */}
          {visibleRows.map((row) => (
            <div key={row.id} className="mb-8 px-4 max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold tracking-tight text-white">{row.title}</h3>
              </div>
              <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                {row.dramas.map((drama) => {
                  const saved = userDramas.find(d => d.tmdb_id === drama.tmdbId)
                  return (
                    <div key={drama.dramaId} className="flex-shrink-0 w-30 sm:w-32 flex flex-col gap-1.5">
                      <button
                        onClick={() => handleOpenDrama(drama)}
                        className="group relative aspect-[2/3] w-full overflow-hidden rounded-[20px] bg-[#161622] border border-white/[0.14] shadow-md active:scale-95 transition-transform duration-150 cursor-pointer touch-manipulation"
                      >
                        {drama.posterUrl ? (
                          <Image
                            src={drama.posterUrl.replace('/original/', '/w342/')}
                            alt={drama.title}
                            fill
                            loading="lazy"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="128px"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-white/20 text-xs">?</div>
                        )}
                        {drama.rating > 0 && (
                          <div className="absolute top-1.5 right-1.5">
                            <span className="flex items-center gap-0.5 rounded-full bg-black/60 backdrop-blur-md border border-amber-400/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                              <Star size={8} className="fill-amber-300" />{drama.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </button>
                      <p className="text-[11px] font-semibold text-white/80 line-clamp-1 leading-tight px-0.5">{drama.title}</p>
                      {/* Action buttons */}
                      <div className="flex items-center gap-1 px-0.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => quickAdd(drama, 'watchlist', e)}
                          className={`flex items-center justify-center h-6 w-6 rounded-full border transition-all active:scale-90 cursor-pointer touch-manipulation ${
                            saved?.status === 'watchlist' ? 'bg-sky-500/35 border-sky-400/50 text-sky-200' : 'bg-white/[0.08] border-white/[0.14] text-white/50'
                          }`}
                        >
                          <Bookmark size={10} fill={saved?.status === 'watchlist' ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={e => quickAdd(drama, 'watching', e)}
                          className={`flex items-center justify-center h-6 w-6 rounded-full border transition-all active:scale-90 cursor-pointer touch-manipulation ${
                            saved?.status === 'watching' ? 'bg-purple-500/35 border-purple-400/50 text-purple-200' : 'bg-white/[0.08] border-white/[0.14] text-white/50'
                          }`}
                        >
                          <Play size={9} fill={saved?.status === 'watching' ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={e => quickAdd(drama, 'finished', e)}
                          className={`flex items-center justify-center h-6 w-6 rounded-full border transition-all active:scale-90 cursor-pointer touch-manipulation ${
                            saved?.status === 'finished' ? 'bg-emerald-500/35 border-emerald-400/50 text-emerald-200' : 'bg-white/[0.08] border-white/[0.14] text-white/50'
                          }`}
                        >
                          <CheckCircle size={10} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {discoverLoading && !discoverData && (
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-purple-400" />
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ─── Search Result Card ───────────────────────────────────────────────────────

interface SearchResultCardProps {
  drama: Drama
  savedStatus?: DramaStatus
  onOpen: () => void
  onQuickAdd: (status: DramaStatus, e: React.MouseEvent) => void
}

function SearchResultCard({ drama, savedStatus, onOpen, onQuickAdd }: SearchResultCardProps) {
  const regionBadge = drama.country ? REGION_NAMES[drama.country.toUpperCase()]?.badge || drama.country : null
  let eps = ''
  if (drama.totalEpisodes && drama.totalEpisodes > 1) eps = `${drama.totalEpisodes} eps`
  else if (drama.airingStatus === 'upcoming') eps = 'Upcoming'
  else if (drama.airingStatus === 'ongoing') eps = 'Ongoing'

  const subline = [regionBadge, drama.releaseYear > 0 ? String(drama.releaseYear) : null, eps].filter(Boolean).join(' • ')
  const thumbSrc = tmdbThumb(drama.posterUrl)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => e.key === 'Enter' && onOpen()}
      className="group relative flex gap-3.5 rounded-[22px] border border-white/[0.16] bg-white/[0.08] backdrop-blur-xl p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_8px_24px_rgba(0,0,0,0.5)] transition-transform duration-150 active:scale-[0.98] cursor-pointer touch-manipulation select-none transform-gpu"
    >
      <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-black/60 shadow-md border border-white/[0.12]">
        {thumbSrc ? (
          <Image src={thumbSrc} alt={drama.title} fill className="object-cover" sizes="80px" loading="lazy" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white/20 text-xs">No Image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between overflow-hidden py-0.5">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-white leading-tight truncate">{drama.title}</h3>
          {drama.nativeTitle && <p className="text-xs text-white/40 truncate mt-0.5">{drama.nativeTitle}</p>}
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            {subline && <span className="text-[11px] font-medium text-white/50">{subline}</span>}
            {drama.rating > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-black/40 border border-amber-400/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                <Star size={9} className="fill-amber-300 text-amber-300" />{drama.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <QuickActionPill icon={Bookmark} title="Watchlist" label="Watchlist" isActive={savedStatus === 'watchlist'} activeClass="border-sky-400/50 bg-sky-500/25 text-sky-200" onClick={e => onQuickAdd('watchlist', e)} />
            <QuickActionPill icon={Play} title="Watching" label="Watching" isActive={savedStatus === 'watching'} activeClass="border-purple-400/50 bg-purple-500/25 text-purple-200" onClick={e => onQuickAdd('watching', e)} />
            <QuickActionPill icon={CheckCircle} title="Finished" label="Finished" isActive={savedStatus === 'finished'} activeClass="border-emerald-400/50 bg-emerald-500/25 text-emerald-200" onClick={e => onQuickAdd('finished', e)} />
          </div>
          {savedStatus && <span className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">In {savedStatus}</span>}
        </div>
      </div>
    </div>
  )
}

function QuickActionPill({ icon: Icon, title, label, isActive, activeClass, onClick }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string; label: string; isActive?: boolean; activeClass: string
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-100 active:scale-95 cursor-pointer touch-manipulation select-none ${
        isActive ? activeClass : 'border-white/[0.14] bg-white/[0.06] text-white/60 hover:bg-white/[0.12] hover:text-white'
      }`}
    >
      <Icon size={11} className={isActive ? 'fill-current' : ''} />
      <span>{label}</span>
    </button>
  )
}
