'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import {
  Search, X, Loader2, Compass, Bookmark, Play,
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
import VibeChart from '@/components/vibe/VibeChart'

interface SearchTabProps {
  onOpenDrama: (id: number, preview?: Drama) => void
  onOpenPerson: (id: number, name?: string) => void
  onTabChange?: (tab: 'search' | 'watchlist' | 'watching' | 'finished') => void
  discoverData?: DiscoverData | null
  onDiscoverLoaded?: (data: DiscoverData) => void
}

interface DiscoverRow { id: string; title: string; dramas: Drama[] }
export interface DiscoverData { hero: Drama[]; talkOfTheTown?: Drama[]; rows: DiscoverRow[] }

// Custom SVG tilted megaphone icon with sound lines matching Photo 4
function MegaphoneIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 11l13-5v12L3 13v-2z" fill="currentColor" fillOpacity={0.2} />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      <path d="M19 8c1.3 1.2 2 2.8 2 4s-.7 2.8-2 4" />
      <path d="M21 5c2.3 2 3.5 4.7 3.5 7s-1.2 5-3.5 7" />
    </svg>
  )
}

function getBuzzLabel(drama: Drama): string {
  if (!drama.firstAirDate) return 'Airing Now'
  const airTime = new Date(drama.firstAirDate).getTime()
  const now = Date.now()
  if (airTime > now || drama.airingStatus === 'upcoming') {
    return 'Upcoming'
  }
  const diffDays = Math.floor((now - airTime) / (1000 * 60 * 60 * 24))
  if (diffDays <= 45 || drama.airingStatus === 'ongoing') {
    return 'Airing Now'
  }
  return 'New Show'
}

export default function SearchTab({
  onOpenDrama,
  onOpenPerson: _onOpenPerson,
  onTabChange,
  discoverData: propDiscoverData,
  onDiscoverLoaded,
}: SearchTabProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Drama[]>([])
  const [searching, setSearching] = useState(false)
  const [userDramas, setUserDramas] = useState<UserDrama[]>(() => getSavedDramasSync())
  const [discoverData, setDiscoverData] = useState<DiscoverData | null>(() => propDiscoverData || null)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (propDiscoverData) {
      setDiscoverData(propDiscoverData)
    }
  }, [propDiscoverData])

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

  // Load discover data once if not already provided
  const loadDiscover = useCallback(async () => {
    if (propDiscoverData) return
    setDiscoverLoading(true)
    try {
      const res = await fetch('/api/discover?region=ALL')
      if (res.ok) {
        const data = await res.json()
        setDiscoverData(data)
        onDiscoverLoaded?.(data)
      }
    } catch { /* ignore */ }
    setDiscoverLoading(false)
  }, [propDiscoverData, onDiscoverLoaded])

  useEffect(() => {
    if (!discoverData && !propDiscoverData) loadDiscover()
  }, [discoverData, propDiscoverData, loadDiscover])

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

  function handleOpenDrama(drama: Drama) {
    ;(document.activeElement as HTMLElement)?.blur()
    onOpenDrama(drama.tmdbId, drama)
  }

  function handleSpotlightMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
  }

  function handleCardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (typeof window === 'undefined' || !window.matchMedia('(hover: hover)').matches) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = Math.max(-4, Math.min(4, ((y - centerY) / centerY) * -4))
    const rotateY = Math.max(-4, Math.min(4, ((x - centerX) / centerX) * 4))

    e.currentTarget.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1)`
    e.currentTarget.style.setProperty('--glare-x', `${x}px`)
    e.currentTarget.style.setProperty('--glare-y', `${y}px`)
  }

  function handleCardMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    e.currentTarget.style.transform = ''
  }

  const showResults = query.trim().length > 0

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

  // Dedicated Talk Of The Town list (strictly recent & upcoming dramas)
  const talkOfTheTownDramas: Drama[] = useMemo(() => {
    if (discoverData?.talkOfTheTown && discoverData.talkOfTheTown.length > 0) {
      return discoverData.talkOfTheTown
    }
    const cutoffTime = Date.now() - 75 * 24 * 60 * 60 * 1000
    return allDiscoverDramas.filter(d => {
      if (!d.firstAirDate) return false
      const airTime = new Date(d.firstAirDate).getTime()
      return airTime >= cutoffTime
    })
  }, [discoverData, allDiscoverDramas])

  return (
    <div className="relative z-10 flex flex-col min-h-screen bg-transparent">
      {/* 1. CLEAN EDITORIAL HEADER (NO SUBHO, NO SUBTITLE, NO COUNTER PILLS - PHOTO 2) */}
      <header className="px-6 pt-6 sm:pt-8 pb-3 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#c24816] via-[#c80815] to-[#ff4069] text-white shadow-sm">
              <Compass size={15} />
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-none">
              Explore<span className="text-[#c80815] font-serif italic">.</span>
            </h1>
          </div>
        </div>
      </header>

      {/* 2. FLOATING iOS SPOTLIGHT SEARCH BAR */}
      <div className="sticky top-16 z-30 px-6 pt-2 pb-3 max-w-6xl mx-auto w-full">
        <div className="relative flex items-center rounded-full bg-black/50 backdrop-blur-3xl border border-white/20 px-4 py-3 gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_12px_32px_rgba(0,0,0,0.6)] transform-gpu hover:border-white/25 focus-within:scale-[1.01] focus-within:border-pink-400/40 focus-within:shadow-[0_0_25px_-5px_rgba(244,114,182,0.25)] transition-all duration-500">
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
        <div className="relative z-10 flex-1 px-6 pb-36 max-w-6xl mx-auto w-full">
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
              const posterSrc = tmdbCard(drama.posterUrl)
              const buzzLabel = getBuzzLabel(drama)

              return (
                <div
                  key={drama.dramaId}
                  onClick={() => handleOpenDrama(drama)}
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                  className="group flex flex-col cursor-pointer touch-manipulation select-none hover:-translate-y-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                >
                  <div
                    onMouseMove={handleCardMouseMove}
                    onMouseLeave={handleCardMouseLeave}
                    className="relative aspect-[2/3] w-full rounded-[12px] overflow-hidden bg-white/[0.04] shadow-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu"
                  >
                    {/* Soft Diagonal Glass Glare Overlay */}
                    <div
                      className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
                      style={{
                        background: 'radial-gradient(260px circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.16) 0%, transparent 60%), linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 50%)',
                      }}
                    />
                    {posterSrc ? (
                      <Image
                        src={posterSrc}
                        alt={drama.title}
                        fill
                        sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 20vw"
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-black/70 text-white/25 text-xs font-medium">No Poster</div>
                    )}
                  </div>
                  <h3 className="mt-2.5 text-[15px] font-bold text-white leading-snug truncate">
                    {drama.title}
                  </h3>
                  <p className="mt-0.5 text-[13px] font-medium text-white/50">
                    {buzzLabel}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── MOCTALE EXPLORE & TASTE CLUB SHOWCASE ─────────────────── */
        <div className="relative z-10 flex-1 px-6 pb-36 max-w-6xl mx-auto w-full">

          {/* 3. SHOWCASE DUAL BENTO CARDS (CLEAN 2-COLUMN, SAME h-[460px], SINGLE BORDER - PHOTO 5) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mt-4">
            
            {/* Left Card: 3-Column Moving Poster Wall (100% clean artwork, no overlay bar - PHOTO 6) */}
            <div
              onMouseMove={handleSpotlightMove}
              className="group lg:col-span-6 h-[460px] rounded-[28px] bg-[#101016]/85 border border-white/[0.08] overflow-hidden relative shadow-2xl"
            >
              {/* Aceternity UI Cursor-Following Border Spotlight */}
              <div
                className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                style={{
                  background: 'radial-gradient(320px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(244, 114, 182, 0.14), transparent 70%)',
                }}
              />
              <MovingPosterWall
                dramas={allDiscoverDramas}
                onPosterClick={(id, preview) => {
                  const matched = allDiscoverDramas.find(d => d.tmdbId === id)
                  handleOpenDrama(matched || (preview as Drama) || ({ tmdbId: id, dramaId: id, title: '' } as any))
                }}
                className="h-full w-full"
              />
            </div>

            {/* Right Card: Vibe Chart (No double border, simply "Vibe Chart", scaled w-48 h-48 donut - PHOTO 5) */}
            <div
              onMouseMove={handleSpotlightMove}
              className="group lg:col-span-6 h-[460px] rounded-[28px] bg-[#101016]/85 border border-white/[0.08] shadow-2xl p-6 flex flex-col justify-between overflow-hidden relative"
            >
              {/* Aceternity UI Cursor-Following Border Spotlight */}
              <div
                className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                style={{
                  background: 'radial-gradient(320px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(244, 114, 182, 0.14), transparent 70%)',
                }}
              />
              <VibeChart
                savedDramas={userDramas}
                title="Vibe Chart"
                selectedVibe={selectedVibe}
                onSelectVibe={(v) => setSelectedVibe(prev => prev === v ? null : v)}
                borderless
              />
            </div>

          </div>

          {/* 4. "TALK OF THE TOWN" SECTION (EXACT LAYOUT FROM PHOTO 4) */}
          <div className="relative mt-12 mb-6 pt-4">
            {/* Soft purple/indigo radial glow behind section header */}
            <div className="pointer-events-none absolute -top-8 -left-8 w-80 h-32 bg-[radial-gradient(ellipse_at_top_left,_rgba(99,102,241,0.18),_transparent_60%)] blur-xl" />

            <div className="relative z-10 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/10 shadow-sm">
                <MegaphoneIcon className="w-6 h-6 text-white -rotate-12" />
              </div>
              <h2 className="text-[24px] font-bold tracking-tight text-white leading-none">
                Talk Of The Town
              </h2>
            </div>
          </div>

          {/* 5. 5-COLUMN POSTER GRID (FRAMELESS POSTER + BOLD TITLE + BUZZ LABEL) */}
          {discoverLoading && talkOfTheTownDramas.length === 0 ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8">
              {talkOfTheTownDramas.map((drama) => {
                const posterSrc = tmdbCard(drama.posterUrl)
                const buzzLabel = getBuzzLabel(drama)

                return (
                  <div
                    key={drama.dramaId}
                    onClick={() => handleOpenDrama(drama)}
                    className="group flex flex-col cursor-pointer touch-manipulation select-none hover:-translate-y-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  >
                    {/* Clean Frameless Poster with Apple TV+ 3D Micro-Tilt & Glass Glare */}
                    <div
                      onMouseMove={handleCardMouseMove}
                      onMouseLeave={handleCardMouseLeave}
                      className="relative aspect-[2/3] w-full rounded-[12px] overflow-hidden bg-white/[0.04] shadow-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu"
                    >
                      {/* Soft Diagonal Glass Glare Overlay */}
                      <div
                        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
                        style={{
                          background: 'radial-gradient(260px circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.16) 0%, transparent 60%), linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 50%)',
                        }}
                      />
                      {posterSrc ? (
                        <Image
                          src={posterSrc}
                          alt={drama.title}
                          fill
                          sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 20vw"
                          loading="lazy"
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-black/60 text-white/25 text-xs font-medium">No Poster</div>
                      )}
                    </div>

                    {/* Line 1: Bold Drama Title */}
                    <h3 className="mt-2.5 text-[15px] font-bold text-white leading-snug truncate">
                      {drama.title}
                    </h3>

                    {/* Line 2: Buzz Label (Upcoming, New Show, Airing Now, Trending Series) */}
                    <p className="mt-0.5 text-[13px] font-medium text-white/50">
                      {buzzLabel}
                    </p>
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
