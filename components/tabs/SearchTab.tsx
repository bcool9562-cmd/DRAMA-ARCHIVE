'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Search, X, Bookmark, Play, CheckCircle, Loader2, Star } from 'lucide-react'
import type { Drama } from '@/lib/tmdb'
import { tmdbThumb } from '@/lib/image-utils'
import {
  addDrama, moveDrama, removeDrama, getUserDramas,
  getSavedDramasSync, onArchiveSync,
  type DramaStatus, type UserDrama,
} from '@/lib/supabase/archive'
import { REGION_NAMES } from '@/components/drama/DramaDetailSheet'

interface SearchTabProps {
  onOpenDrama: (id: number, preview?: Drama) => void
  onOpenPerson: (id: number, name?: string) => void
}

interface DiscoverRow { id: string; title: string; dramas: Drama[] }
interface DiscoverData { hero: Drama[]; rows: DiscoverRow[] }

const COUNTRY_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'KR', label: 'K-Drama' },
  { id: 'CN', label: 'C-Drama' },
  { id: 'JP', label: 'J-Drama' },
  { id: 'TW', label: 'Taiwanese' },
  { id: 'TH', label: 'Thai' },
]

export default function SearchTab({ onOpenDrama, onOpenPerson: _onOpenPerson }: SearchTabProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Drama[]>([])
  const [searching, setSearching] = useState(false)
  const [userDramas, setUserDramas] = useState<UserDrama[]>(() => getSavedDramasSync())
  const [discoverData, setDiscoverData] = useState<DiscoverData | null>(null)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [heroIndex, setHeroIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const heroTimer = useRef<ReturnType<typeof setInterval> | null>(null)

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
        setHeroIndex(0)
      }
    } catch { /* ignore */ }
    setDiscoverLoading(false)
  }, [])

  useEffect(() => {
    if (!query.trim()) loadDiscover(activeFilter)
  }, [activeFilter, loadDiscover, query])

  useEffect(() => {
    if (query.trim()) return
    if (!discoverData) loadDiscover('ALL')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-rotate hero every 4.5 seconds
  useEffect(() => {
    if (!discoverData?.hero?.length) return
    heroTimer.current = setInterval(() => {
      setHeroIndex(i => (i + 1) % Math.min(5, discoverData.hero.length))
    }, 4500)
    return () => { if (heroTimer.current) clearInterval(heroTimer.current) }
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

  function quickAdd(drama: Drama, targetStatus: DramaStatus, e: React.MouseEvent) {
    e.stopPropagation()
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
  const watchingDramas = userDramas.filter(d => d.status === 'watching')
  const heroList = discoverData?.hero ?? []
  const currentHero = heroList[heroIndex]

  // Filter rows by active region
  const filteredRows = discoverData?.rows?.filter(row => {
    if (activeFilter === 'ALL') return true
    if (row.id === 'trending') return true
    const regionMap: Record<string, string[]> = {
      KR: ['kr', 'top'],
      CN: ['cn', 'top'],
      JP: ['jp', 'top'],
      TW: ['cn', 'tw', 'top'],
      TH: ['th', 'top'],
    }
    return regionMap[activeFilter]?.includes(row.id) ?? false
  }) ?? []

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Ambient radial background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(147,51,234,0.12),_transparent_65%)]" />
      </div>

      {/* Sticky Search Bar */}
      <div
        className="sticky top-0 z-30 px-4 pt-14 pb-3 max-w-3xl mx-auto w-full"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: 'rgba(0,0,0,0.6)',
        }}
      >
        <div className="relative flex items-center rounded-2xl border border-white/[0.14] bg-white/[0.08] px-4 py-3 gap-3 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)]">
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
            placeholder="Search K-Drama, C-Drama, J-Drama…"
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
                Try searching in English, Korean, or Chinese title, or search by actor name.
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
        /* ── DISCOVER HOME ──────────────────────────────────────── */
        <div className="relative z-10 flex-1 pb-36">

          {/* Country Filter Bar */}
          <div className="px-4 mb-4 max-w-3xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {COUNTRY_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation select-none ${
                    activeFilter === f.id
                      ? 'bg-white text-black border-white shadow-md'
                      : 'bg-white/[0.07] border-white/[0.15] text-white/70 hover:bg-white/[0.12]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {discoverLoading && !discoverData ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-purple-400" />
            </div>
          ) : (
            <>
              {/* ── Hero Spotlight Carousel ─────────────────────── */}
              {currentHero && (
                <div className="relative mx-4 mb-6 rounded-[28px] overflow-hidden bg-[#161622] border border-white/[0.10] shadow-2xl" style={{ aspectRatio: '16/9', maxHeight: '280px' }}>
                  {/* Hero Backdrop */}
                  {heroList.map((hero, idx) => (
                    <div
                      key={hero.tmdbId}
                      className="absolute inset-0 transition-opacity duration-700"
                      style={{ opacity: idx === heroIndex ? 1 : 0 }}
                    >
                      {hero.backdropUrl && (
                        <Image
                          src={hero.backdropUrl.replace('/original/', '/w1280/')}
                          alt={hero.title}
                          fill
                          priority={idx === 0}
                          loading={idx === 0 ? 'eager' : 'lazy'}
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 768px"
                        />
                      )}
                    </div>
                  ))}

                  {/* Vignette gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />

                  {/* Hero Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    {/* Meta pills */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {currentHero.country && REGION_NAMES[currentHero.country] && (
                        <span className="rounded-full bg-white/20 backdrop-blur-sm border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">
                          {REGION_NAMES[currentHero.country].badge}
                        </span>
                      )}
                      {currentHero.rating > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500/30 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                          <Star size={9} className="fill-amber-300" />{currentHero.rating.toFixed(1)}
                        </span>
                      )}
                      {currentHero.releaseYear > 0 && (
                        <span className="text-[10px] text-white/60 font-medium">{currentHero.releaseYear}</span>
                      )}
                    </div>

                    <h2 className="text-xl font-extrabold tracking-tight text-white leading-tight mb-1 line-clamp-2">
                      {currentHero.title}
                    </h2>
                    {currentHero.synopsis && (
                      <p className="text-xs text-white/65 line-clamp-2 mb-3 leading-relaxed max-w-sm">
                        {currentHero.synopsis}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenDrama(currentHero)}
                        className="flex items-center gap-1.5 rounded-full bg-white text-black px-4 py-2 text-xs font-bold active:scale-95 transition-transform duration-150 cursor-pointer touch-manipulation select-none"
                      >
                        View Details
                      </button>
                      <button
                        onClick={e => quickAdd(currentHero, 'watchlist', e)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold active:scale-95 transition-all duration-150 cursor-pointer touch-manipulation select-none ${
                          userDramas.find(d => d.tmdb_id === currentHero.tmdbId)?.status === 'watchlist'
                            ? 'bg-sky-500/30 border-sky-400/50 text-sky-200'
                            : 'bg-white/[0.15] border-white/[0.25] text-white'
                        }`}
                      >
                        <Bookmark size={12} fill={userDramas.find(d => d.tmdb_id === currentHero.tmdbId)?.status === 'watchlist' ? 'currentColor' : 'none'} />
                        {userDramas.find(d => d.tmdb_id === currentHero.tmdbId)?.status === 'watchlist' ? 'Saved' : '+ Watchlist'}
                      </button>
                    </div>
                  </div>

                  {/* Dot Indicators */}
                  {heroList.length > 1 && (
                    <div className="absolute bottom-3 right-4 flex items-center gap-1">
                      {heroList.slice(0, 5).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setHeroIndex(idx)}
                          className={`rounded-full transition-all duration-200 cursor-pointer touch-manipulation ${
                            idx === heroIndex ? 'bg-white w-4 h-1.5' : 'bg-white/40 w-1.5 h-1.5'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Continue Watching Row ──────────────────────── */}
              {watchingDramas.length > 0 && (
                <div className="mb-6">
                  <div className="px-4 flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold tracking-tight text-white">Continue Watching</h3>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {watchingDramas.map(drama => (
                      <button
                        key={drama.drama_id}
                        onClick={() => onOpenDrama(drama.tmdb_id, drama as any)}
                        className="flex-shrink-0 flex flex-col gap-1.5 w-28 active:scale-95 transition-transform duration-150 cursor-pointer touch-manipulation select-none text-left"
                      >
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[18px] bg-[#1a1a24] border border-white/[0.12]">
                          {drama.poster_url ? (
                            <Image src={drama.poster_url.replace('/original/', '/w342/')} alt={drama.title} fill loading="lazy" className="object-cover" sizes="112px" />
                          ) : <div className="flex h-full w-full items-center justify-center text-white/20 text-xs">?</div>}
                          <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/80 to-transparent" />
                          <div className="absolute bottom-1 left-1.5 right-1.5">
                            <div className="h-0.5 w-full rounded-full bg-white/20">
                              <div className="h-full w-1/3 rounded-full bg-purple-400" />
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] font-semibold text-white/80 line-clamp-2 leading-tight px-0.5">{drama.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Swimlane Rows ──────────────────────────────── */}
              {filteredRows.map((row, rowIdx) => (
                <div key={row.id} className="mb-7">
                  <div className="px-4 flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold tracking-tight text-white">{row.title}</h3>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {row.dramas.map((drama, idx) => {
                      const saved = userDramas.find(d => d.tmdb_id === drama.tmdbId)
                      const isRanked = row.id === 'trending'
                      return (
                        <div key={drama.dramaId} className="flex-shrink-0 w-32 flex flex-col gap-1.5">
                          {/* Poster */}
                          <button
                            onClick={() => handleOpenDrama(drama)}
                            className="relative aspect-[2/3] w-full overflow-hidden rounded-[20px] bg-[#1a1a24] border border-white/[0.10] active:scale-95 transition-transform duration-150 cursor-pointer touch-manipulation"
                          >
                            {drama.posterUrl ? (
                              <Image
                                src={drama.posterUrl.replace('/original/', '/w342/')}
                                alt={drama.title}
                                fill
                                loading={rowIdx === 0 && idx < 4 ? 'eager' : 'lazy'}
                                className="object-cover"
                                sizes="128px"
                              />
                            ) : <div className="flex h-full w-full items-center justify-center text-white/20 text-xs">?</div>}
                            {/* Rank number for trending */}
                            {isRanked && idx < 10 && (
                              <div className="absolute bottom-0 left-0 pb-1 pl-2">
                                <span className="text-[48px] font-black text-white/90 leading-none" style={{ WebkitTextStroke: '2px rgba(0,0,0,0.8)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                                  {idx + 1}
                                </span>
                              </div>
                            )}
                            {drama.rating > 0 && (
                              <div className="absolute top-1.5 right-1.5">
                                <span className="flex items-center gap-0.5 rounded-full bg-black/70 border border-amber-400/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                                  <Star size={8} className="fill-amber-300" />{drama.rating.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </button>
                          {/* Title */}
                          <p className="text-[11px] font-semibold text-white/80 line-clamp-2 leading-tight px-0.5">{drama.title}</p>
                          {/* Quick actions */}
                          <div className="flex items-center gap-1 px-0.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={e => quickAdd(drama, 'watchlist', e)}
                              className={`flex items-center justify-center h-6 w-6 rounded-full border transition-colors duration-100 active:scale-90 cursor-pointer touch-manipulation ${
                                saved?.status === 'watchlist' ? 'bg-sky-500/30 border-sky-400/50 text-sky-300' : 'bg-white/[0.06] border-white/[0.12] text-white/50'
                              }`}
                            >
                              <Bookmark size={10} fill={saved?.status === 'watchlist' ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={e => quickAdd(drama, 'watching', e)}
                              className={`flex items-center justify-center h-6 w-6 rounded-full border transition-colors duration-100 active:scale-90 cursor-pointer touch-manipulation ${
                                saved?.status === 'watching' ? 'bg-purple-500/30 border-purple-400/50 text-purple-300' : 'bg-white/[0.06] border-white/[0.12] text-white/50'
                              }`}
                            >
                              <Play size={9} fill={saved?.status === 'watching' ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={e => quickAdd(drama, 'finished', e)}
                              className={`flex items-center justify-center h-6 w-6 rounded-full border transition-colors duration-100 active:scale-90 cursor-pointer touch-manipulation ${
                                saved?.status === 'finished' ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-300' : 'bg-white/[0.06] border-white/[0.12] text-white/50'
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
            </>
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
      className="group relative flex gap-3.5 rounded-[22px] border border-white/[0.12] bg-[#14141c]/95 p-3 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)] transition-transform duration-150 active:scale-[0.98] cursor-pointer touch-manipulation select-none"
    >
      <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-black/60 shadow-md">
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
