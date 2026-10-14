'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Search, X, Bookmark, Play, CheckCircle, Loader2, Star, Sparkles } from 'lucide-react'
import type { Drama } from '@/lib/tmdb'
import { addDrama, getUserDramas, type DramaStatus, type UserDrama } from '@/lib/supabase/archive'
import DramaDetailSheet, { REGION_NAMES } from '@/components/drama/DramaDetailSheet'
import PersonProfileSheet from '@/components/person/PersonProfileSheet'

export default function SearchTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Drama[]>([])
  const [searching, setSearching] = useState(false)
  const [userDramas, setUserDramas] = useState<UserDrama[]>([])
  const [addingStatus, setAddingStatus] = useState<Record<string, DramaStatus | 'loading'>>({})
  const [selectedDramaId, setSelectedDramaId] = useState<number | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)
  const [, setSelectedPersonName] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load user's saved dramas to show active sync states on search cards
  const refreshUserDramas = useCallback(async () => {
    try {
      const data = await getUserDramas()
      setUserDramas(data)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    refreshUserDramas()
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

  async function quickAdd(drama: Drama, status: DramaStatus, e: React.MouseEvent) {
    e.stopPropagation()
    setAddingStatus(prev => ({ ...prev, [drama.dramaId]: 'loading' }))
    await addDrama({
      drama_id: drama.dramaId,
      tmdb_id: drama.tmdbId,
      title: drama.title,
      native_title: drama.nativeTitle,
      poster_url: drama.posterUrl,
      country: drama.country,
      release_year: drama.releaseYear,
      total_episodes: drama.totalEpisodes,
      rating: drama.rating,
      status,
      airing_status: drama.airingStatus,
      first_air_date: drama.firstAirDate || null,
      next_episode_date: drama.nextEpisodeDate,
      next_episode_number: drama.nextEpisodeNumber,
    })
    setAddingStatus(prev => ({ ...prev, [drama.dramaId]: status }))
    await refreshUserDramas()
    setTimeout(() => {
      setAddingStatus(prev => {
        const copy = { ...prev }
        delete copy[drama.dramaId]
        return copy
      })
    }, 2000)
  }

  function handlePersonClick(personId: number, name: string) {
    setSelectedPersonId(personId)
    setSelectedPersonName(name)
  }

  function handleDramaFromPerson(tmdbId: number) {
    setSelectedPersonId(null)
    setSelectedDramaId(tmdbId)
  }

  const showResults = query.trim().length > 0
  const featuredPoster = results.find(d => d.posterUrl)?.posterUrl

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Ambient Poster Glow Layer */}
      {featuredPoster && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div
            className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[140%] h-[75vh] rounded-full blur-[130px] saturate-200 opacity-25 scale-125 transition-all duration-700"
            style={{
              backgroundImage: `url(${featuredPoster})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black" />
        </div>
      )}

      {/* iOS Floating Search Bar */}
      <div className="sticky top-0 z-30 px-4 pt-16 pb-3 max-w-3xl mx-auto w-full">
        <div className="relative flex items-center rounded-2xl border border-white/[0.15] bg-white/[0.08] backdrop-blur-2xl px-4 py-3 gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_14px_36px_-6px_rgba(0,0,0,0.6)]">
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
            className="flex-1 bg-transparent text-sm font-medium text-white placeholder-white/35 outline-none tracking-tight"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]) }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition active:scale-90"
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-lg backdrop-blur-xl mb-1">
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
              const currentAction = addingStatus[drama.dramaId]

              return (
                <SearchResultCard
                  key={drama.dramaId}
                  drama={drama}
                  savedStatus={savedStatus}
                  addingStatus={currentAction}
                  onOpen={() => setSelectedDramaId(drama.tmdbId)}
                  onQuickAdd={(status, e) => quickAdd(drama, status, e)}
                />
              )
            })}
          </div>
        </div>
      ) : (
        /* Empty State Hero with Apple TV+ aesthetic */
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center max-w-md mx-auto">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-bold text-purple-300 shadow-md">
              K-Drama
            </span>
            <span className="rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-300 shadow-md">
              C-Drama
            </span>
            <span className="rounded-full border border-pink-500/30 bg-pink-500/15 px-3 py-1 text-xs font-bold text-pink-300 shadow-md">
              J-Drama
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 shadow-md">
              Taiwanese
            </span>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 shadow-md">
              Thai
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">Find Your Next Drama</h2>
            <p className="mt-2 text-sm text-white/50 leading-relaxed">
              Instant letter-by-letter live search powered by TMDB & MyDramaList. High-definition 4K posters & rich actor profiles.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-medium text-white/30 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-md">
            <Sparkles size={12} className="text-amber-400" />
            <span>Search by English, Korean, or Chinese title</span>
          </div>
        </div>
      )}

      {/* Drama Detail Sheet */}
      {selectedDramaId && (
        <DramaDetailSheet
          tmdbId={selectedDramaId}
          onClose={() => {
            setSelectedDramaId(null)
            refreshUserDramas()
          }}
          onPersonClick={handlePersonClick}
        />
      )}

      {/* Person Profile Sheet */}
      {selectedPersonId && (
        <PersonProfileSheet
          personId={selectedPersonId}
          onClose={() => setSelectedPersonId(null)}
          onDramaClick={handleDramaFromPerson}
        />
      )}
    </div>
  )
}

// ─── Search Result Card ───────────────────────────────────────────────────────

interface SearchResultCardProps {
  drama: Drama
  savedStatus?: DramaStatus
  addingStatus: DramaStatus | 'loading' | undefined
  onOpen: () => void
  onQuickAdd: (status: DramaStatus, e: React.MouseEvent) => void
}

function SearchResultCard({
  drama,
  savedStatus,
  addingStatus,
  onOpen,
  onQuickAdd,
}: SearchResultCardProps) {
  const regionBadge = drama.country ? REGION_NAMES[drama.country.toUpperCase()]?.badge || drama.country : null
  const isLoading = addingStatus === 'loading'

  let eps = ''
  if (drama.totalEpisodes && drama.totalEpisodes > 1) {
    eps = `${drama.totalEpisodes} eps`
  } else if (drama.airingStatus === 'upcoming') {
    eps = 'Upcoming'
  } else if (drama.airingStatus === 'ongoing') {
    eps = 'Ongoing'
  }

  const subline = [regionBadge, drama.releaseYear > 0 ? String(drama.releaseYear) : null, eps]
    .filter(Boolean)
    .join(' • ')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => e.key === 'Enter' && onOpen()}
      className="group relative flex gap-3.5 rounded-[22px] border border-white/[0.14] bg-white/[0.05] p-3 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_32px_-6px_rgba(0,0,0,0.6)] transition-all duration-200 hover:bg-white/[0.09] hover:border-white/[0.22] active:scale-[0.99] cursor-pointer"
    >
      {/* Poster thumbnail */}
      <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-black/60 shadow-md">
        {drama.posterUrl ? (
          <Image
            src={drama.posterUrl}
            alt={drama.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="80px"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white/20 text-xs">
            No Image
          </div>
        )}
      </div>

      {/* Info & Shelf */}
      <div className="flex flex-1 flex-col justify-between overflow-hidden py-0.5">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-white leading-tight truncate group-hover:text-purple-300 transition-colors">
            {drama.title}
          </h3>
          {drama.nativeTitle && (
            <p className="text-xs text-white/40 truncate mt-0.5">{drama.nativeTitle}</p>
          )}

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            {subline && (
              <span className="text-[11px] font-medium text-white/50">
                {subline}
              </span>
            )}
            {drama.rating > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-black/40 border border-amber-400/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                <Star size={9} className="fill-amber-300 text-amber-300" />
                {drama.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions Shelf */}
        <div className="mt-2 flex items-center justify-between" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            {isLoading ? (
              <div className="flex items-center gap-1.5 text-xs text-white/50">
                <Loader2 size={14} className="animate-spin text-purple-400" />
                <span>Saving…</span>
              </div>
            ) : addingStatus ? (
              <span className="text-xs font-bold text-emerald-400">
                ✓ Added to {addingStatus}
              </span>
            ) : (
              <>
                <QuickActionPill
                  icon={Bookmark}
                  title="Add to Watchlist"
                  label="Watchlist"
                  isActive={savedStatus === 'watchlist'}
                  activeClass="border-sky-400/40 bg-sky-500/20 text-sky-300"
                  onClick={e => onQuickAdd('watchlist', e)}
                />
                <QuickActionPill
                  icon={Play}
                  title="Mark as Watching"
                  label="Watching"
                  isActive={savedStatus === 'watching'}
                  activeClass="border-purple-400/40 bg-purple-500/20 text-purple-300"
                  onClick={e => onQuickAdd('watching', e)}
                />
                <QuickActionPill
                  icon={CheckCircle}
                  title="Mark as Finished"
                  label="Finished"
                  isActive={savedStatus === 'finished'}
                  activeClass="border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                  onClick={e => onQuickAdd('finished', e)}
                />
              </>
            )}
          </div>

          {savedStatus && !addingStatus && (
            <span className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">
              In {savedStatus}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickActionPill({
  icon: Icon,
  title,
  label,
  isActive,
  activeClass,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  label: string
  isActive?: boolean
  activeClass: string
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition active:scale-95 ${
        isActive
          ? activeClass
          : 'border-white/[0.14] bg-white/[0.06] text-white/60 hover:bg-white/[0.12] hover:text-white'
      }`}
    >
      <Icon size={11} className={isActive ? 'fill-current' : ''} />
      <span>{label}</span>
    </button>
  )
}
