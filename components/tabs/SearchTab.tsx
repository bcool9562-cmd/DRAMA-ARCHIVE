'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Search, X, Bookmark, Play, CheckCircle, Loader2, Star, Sparkles } from 'lucide-react'
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

export default function SearchTab({ onOpenDrama, onOpenPerson: _onOpenPerson }: SearchTabProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Drama[]>([])
  const [searching, setSearching] = useState(false)
  const [userDramas, setUserDramas] = useState<UserDrama[]>(() => getSavedDramasSync())
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
      drama_id: drama.dramaId, tmdb_id: drama.tmdbId,
      title: drama.title, native_title: drama.nativeTitle || '',
      poster_url: drama.posterUrl, country: drama.country,
      release_year: drama.releaseYear, total_episodes: drama.totalEpisodes,
      rating: drama.rating, status: targetStatus,
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

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(147,51,234,0.16),_transparent_65%)]" />
      </div>

      {/* iOS Floating Search Bar */}
      <div className="sticky top-0 z-30 px-4 pt-16 pb-3 max-w-3xl mx-auto w-full">
        <div className="relative flex items-center rounded-2xl border border-white/[0.14] bg-white/[0.08] backdrop-blur-md px-4 py-3 gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_32px_-6px_rgba(0,0,0,0.6)]">
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
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition active:scale-90 cursor-pointer touch-manipulation select-none"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {showResults ? (
        <div className="relative z-10 flex-1 px-4 pb-36 max-w-4xl mx-auto w-full">
          {results.length === 0 && !searching && (
            <div className="flex w-full flex-col items-center justify-center py-20 px-6 gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-lg backdrop-blur-md mb-1">
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
              const savedStatus = userSaved?.status
              return (
                <SearchResultCard
                  key={drama.dramaId}
                  drama={drama}
                  savedStatus={savedStatus}
                  onOpen={() => handleOpenDrama(drama)}
                  onQuickAdd={(status, e) => quickAdd(drama, status, e)}
                />
              )
            })}
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center max-w-md mx-auto">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-bold text-purple-300 shadow-md">K-Drama</span>
            <span className="rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-300 shadow-md">C-Drama</span>
            <span className="rounded-full border border-pink-500/30 bg-pink-500/15 px-3 py-1 text-xs font-bold text-pink-300 shadow-md">J-Drama</span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 shadow-md">Taiwanese</span>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 shadow-md">Thai</span>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">Find Your Next Drama</h2>
            <p className="mt-2 text-sm text-white/50 leading-relaxed">
              Instant letter-by-letter live search powered by TMDB & MyDramaList. High-definition retina posters & rich actor profiles.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-white/30 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-md">
            <Sparkles size={12} className="text-amber-400" />
            <span>Search by English, Korean, or Chinese title</span>
          </div>
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
      className="group relative flex gap-3.5 rounded-[22px] border border-white/[0.12] bg-white/[0.05] p-3 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_10px_28px_-6px_rgba(0,0,0,0.6)] transition-transform duration-150 active:scale-[0.98] cursor-pointer touch-manipulation select-none"
    >
      <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-black/60 shadow-md">
        {thumbSrc ? (
          <Image src={thumbSrc} alt={drama.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="80px" loading="lazy" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white/20 text-xs">No Image</div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between overflow-hidden py-0.5">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-white leading-tight truncate group-hover:text-purple-300 transition-colors">{drama.title}</h3>
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
            <QuickActionPill icon={Bookmark} title="Watchlist" label="Watchlist" isActive={savedStatus === 'watchlist'} activeClass="border-sky-400/50 bg-sky-500/25 text-sky-200 shadow-sm" onClick={e => onQuickAdd('watchlist', e)} />
            <QuickActionPill icon={Play} title="Watching" label="Watching" isActive={savedStatus === 'watching'} activeClass="border-purple-400/50 bg-purple-500/25 text-purple-200 shadow-sm" onClick={e => onQuickAdd('watching', e)} />
            <QuickActionPill icon={CheckCircle} title="Finished" label="Finished" isActive={savedStatus === 'finished'} activeClass="border-emerald-400/50 bg-emerald-500/25 text-emerald-200 shadow-sm" onClick={e => onQuickAdd('finished', e)} />
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
      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 cursor-pointer touch-manipulation select-none ${isActive ? activeClass : 'border-white/[0.14] bg-white/[0.06] text-white/60 hover:bg-white/[0.12] hover:text-white'}`}
    >
      <Icon size={11} className={isActive ? 'fill-current' : ''} />
      <span>{label}</span>
    </button>
  )
}
