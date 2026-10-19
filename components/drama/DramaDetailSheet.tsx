'use client'

import { useEffect, useState, useRef, startTransition } from 'react'
import Image from 'next/image'
import SafeImage from '@/components/ui/SafeImage'
import { resolveImageUrl } from '@/lib/image-utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Bookmark, Play, CheckCircle, Star, Maximize2
} from 'lucide-react'
import type { Drama } from '@/lib/tmdb'
import {
  addDrama,
  moveDrama,
  removeDrama,
  getUserDramas,
  getSavedDramasSync,
  onArchiveSync,
  type DramaStatus,
  type UserDrama,
} from '@/lib/supabase/archive'

interface DramaDetailSheetProps {
  tmdbId: number
  initialDrama?: Partial<Drama> | UserDrama | null
  onClose: () => void
  onPersonClick: (personId: number, name: string) => void
}

export const REGION_NAMES: Record<string, { badge: string; full: string }> = {
  KR: { badge: 'K-Drama', full: 'South Korea (K-Drama)' },
  CN: { badge: 'C-Drama', full: 'China (C-Drama)' },
  JP: { badge: 'J-Drama', full: 'Japan (J-Drama)' },
  TW: { badge: 'Taiwanese Drama', full: 'Taiwan (Taiwanese Drama)' },
  HK: { badge: 'HK Drama', full: 'Hong Kong (HK Drama)' },
  TH: { badge: 'Thai Drama', full: 'Thailand (Thai Drama)' },
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function normalizeInitialDrama(
  init: Partial<Drama> | UserDrama | null | undefined,
  tmdbId: number
): Drama | null {
  if (!init) return null
  const isUserDrama = 'drama_id' in init
  return {
    tmdbId,
    dramaId: isUserDrama ? (init as UserDrama).drama_id : (init as Drama).dramaId || `tmdb-${tmdbId}`,
    title: (isUserDrama ? (init as UserDrama).title : (init as Drama).title) || '',
    nativeTitle: (isUserDrama ? (init as UserDrama).native_title : (init as Drama).nativeTitle) || '',
    posterUrl: (isUserDrama ? (init as UserDrama).poster_url : (init as Drama).posterUrl) || '',
    backdropUrl: (init as any).backdropUrl || (init as any).backdrop_url || '',
    country: (isUserDrama ? (init as UserDrama).country : (init as Drama).country) || 'KR',
    releaseYear: (isUserDrama ? (init as UserDrama).release_year : (init as Drama).releaseYear) || 0,
    totalEpisodes: (isUserDrama ? (init as UserDrama).total_episodes : (init as Drama).totalEpisodes) || 0,
    rating: (isUserDrama ? (init as UserDrama).rating : (init as Drama).rating) || 0,
    synopsis: (init as any).synopsis || '',
    airingStatus: (isUserDrama ? (init as UserDrama).airing_status : (init as Drama).airingStatus) || 'completed',
    firstAirDate: (isUserDrama ? (init as UserDrama).first_air_date : (init as Drama).firstAirDate) || '',
    lastAirDate: (init as any).lastAirDate || '',
    nextEpisodeDate: (isUserDrama ? (init as UserDrama).next_episode_date : (init as Drama).nextEpisodeDate) || null,
    nextEpisodeNumber: (isUserDrama ? (init as UserDrama).next_episode_number : (init as Drama).nextEpisodeNumber) || null,
    runtime: (init as any).runtime || null,
    network: (init as any).network || '',
    genres: (init as any).genres || [],
    tags: (init as any).tags || [],
    cast: (init as any).cast || [],
    directors: (init as any).directors || [],
    images: (init as any).images || [],
    backdrops: (init as any).backdrops || [],
  }
}

export default function DramaDetailSheet({
  tmdbId,
  initialDrama,
  onClose,
  onPersonClick,
}: DramaDetailSheetProps) {
  // 0ms Instant Preview: populate immediately with initial card data
  const [drama, setDrama] = useState<Drama | null>(() => normalizeInitialDrama(initialDrama, tmdbId))
  const [loading, setLoading] = useState<boolean>(!initialDrama)
  const [backdropLoaded, setBackdropLoaded] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

  // Single Source of Truth: derive status directly from savedDramas (0ms synchronous lookup)
  const [savedDramas, setSavedDramas] = useState<UserDrama[]>(() => getSavedDramasSync())

  useEffect(() => {
    // Blur any active element (like search input) to prevent tap-swallowing
    (document.activeElement as HTMLElement)?.blur()

    const unsubscribe = onArchiveSync((updated) => setSavedDramas(updated))
    return () => unsubscribe()
  }, [])

  // Background fetch for rich metadata (cast, stills, tags) without delaying sheet opening
  useEffect(() => {
    let isMounted = true
    fetch(`/api/drama/${tmdbId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!isMounted || !d) return
        setDrama((prev) => (prev ? { ...prev, ...d } : d))
        setLoading(false)
      })
      .catch(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [tmdbId])

  // Single Source of Truth calculation with instant local state
  const matchedSaved = savedDramas.find(
    (d) =>
      String(d.tmdb_id) === String(tmdbId) ||
      d.drama_id === (drama?.dramaId ?? `tmdb-${tmdbId}`)
  )
  const [localStatus, setLocalStatus] = useState<DramaStatus | null>(() => matchedSaved?.status ?? null)

  useEffect(() => {
    setLocalStatus(matchedSaved?.status ?? null)
  }, [tmdbId, matchedSaved?.status])

  const currentStatus = localStatus

  // Instant 1-tap handler: toggles off if active, moves or adds immediately (<1ms)
  function handleStatusToggle(targetStatus: DramaStatus) {
    if (!drama) return
    const nextStatus = currentStatus === targetStatus ? null : targetStatus
    setLocalStatus(nextStatus)

    const dramaId = drama.dramaId || `tmdb-${tmdbId}`

    startTransition(() => {
      if (currentStatus === targetStatus) {
        // Single tap on currently active pill removes it
        removeDrama(dramaId)
      } else if (currentStatus) {
        // Single tap on another pill switches status immediately
        moveDrama(dramaId, targetStatus)
      } else {
        // Single tap on inactive pill adds it immediately
        addDrama({
          drama_id: dramaId,
          tmdb_id: tmdbId,
          title: drama.title,
          native_title: drama.nativeTitle || '',
          poster_url: drama.posterUrl || '',
          country: drama.country || 'KR',
          release_year: drama.releaseYear || 0,
          total_episodes: drama.totalEpisodes || 0,
          rating: drama.rating || 0,
          status: targetStatus,
          airing_status: drama.airingStatus || 'completed',
          first_air_date: drama.firstAirDate || null,
          next_episode_date: drama.nextEpisodeDate || null,
          next_episode_number: drama.nextEpisodeNumber || null,
        })
      }
    })
  }

  const allImages = [...(drama?.images ?? []), ...(drama?.backdrops ?? [])]
  const regionInfo = drama?.country ? REGION_NAMES[drama.country.toUpperCase()] : null
  const regionBadge = regionInfo?.badge || (drama?.country ? `${drama.country} Drama` : null)

  // Episode label logic eliminating fake "1" episode bug
  let episodesLabel = 'Upcoming'
  if (drama) {
    if (drama.totalEpisodes && drama.totalEpisodes > 1) {
      episodesLabel = `${drama.totalEpisodes} Episodes`
    } else if (drama.airingStatus === 'ongoing') {
      episodesLabel = 'Ongoing Series'
    } else if (drama.airingStatus === 'completed' && drama.totalEpisodes === 1) {
      episodesLabel = 'Special / Movie'
    } else {
      episodesLabel = 'Upcoming'
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 max-md:backdrop-blur-none md:backdrop-blur-md touch-manipulation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 max-md:backdrop-blur-none md:backdrop-blur-2xl p-4"
            onClick={() => setLightboxSrc(null)}
          >
            <button
              className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white max-md:backdrop-blur-none md:backdrop-blur-xl border border-white/20 transition hover:bg-white/20 active:scale-95 cursor-pointer touch-manipulation"
              onClick={() => setLightboxSrc(null)}
            >
              <X size={20} />
            </button>
            <div className="relative h-[85vh] w-full max-w-4xl">
              <Image src={lightboxSrc} alt="Gallery Still" fill className="object-contain" priority />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Modal Sheet with Hardware-Accelerated Spring Animations */}
      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="relative flex h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[36px] border-t border-white/[0.18] bg-[#08080c] max-md:backdrop-blur-none md:bg-[#0c0c12]/85 md:backdrop-blur-2xl md:border md:border-white/[0.18] md:rounded-[36px] md:my-auto md:max-h-[92dvh] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.9)] touch-manipulation"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clear Cinematic Hero Backdrop (Full Top Hero Area) */}
        {(drama?.backdropUrl || drama?.posterUrl) && (
          <div className="absolute inset-x-0 top-0 h-64 sm:h-80 overflow-hidden pointer-events-none z-0">
            <SafeImage
              src={drama.backdropUrl || drama.posterUrl}
              size="w780"
              alt=""
              fill
              priority
              className="w-full h-full object-cover object-center opacity-65 pointer-events-none transform-gpu animate-ken-burns-settle"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#08080c]/75 to-[#08080c] pointer-events-none" />
          </div>
        )}

        {/* Drag handle */}
        <div className="relative z-10 flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-white/25" />
        </div>

        {/* iOS Close button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.16] bg-black/40 text-white/70 backdrop-blur-md transition hover:bg-white/20 hover:text-white active:scale-90 cursor-pointer touch-manipulation"
        >
          <X size={17} />
        </button>

        {loading && !drama ? (
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-6 space-y-4">
            <div className="w-28 h-40 rounded-[22px] bg-white/[0.05] border border-white/[0.10] animate-pulse" />
            <div className="w-48 h-5 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="w-32 h-3.5 rounded-full bg-white/[0.04] animate-pulse" />
          </div>
        ) : !drama ? (
          <div className="relative z-10 flex flex-1 items-center justify-center text-white/40">
            Failed to load drama details.
          </div>
        ) : (
          <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-36 pt-2 scrollbar-hide">
            
            {/* Poster + Title Section */}
            <div className="flex gap-5 items-end mb-6 mt-4 relative z-10">
              <div className="relative h-44 w-30 flex-shrink-0 overflow-hidden rounded-[22px] border border-white/[0.22] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.3)] bg-black/60">
                {drama.posterUrl ? (
                  <SafeImage
                    src={drama.posterUrl}
                    size="w342"
                    alt={drama.title}
                    fill
                    sizes="120px"
                    priority
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/20 text-xs font-medium">
                    No Poster
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-end flex-1 min-w-0 pb-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-white leading-tight">
                  {drama.title}
                </h1>
                {drama.nativeTitle && (
                  <p className="text-sm font-medium text-white/55 mt-1 leading-snug">
                    {drama.nativeTitle}
                  </p>
                )}
              </div>
            </div>

            {/* Apple TV+ Metadata Ribbon */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide text-xs font-semibold">
              {regionBadge && (
                <span className="flex-shrink-0 rounded-full bg-[#1c1c24] border border-white/[0.18] px-3.5 py-1 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  {regionBadge}
                </span>
              )}

              {drama.network && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="flex-shrink-0 rounded-full bg-[#1c1c24] border border-white/[0.14] px-3.5 py-1 text-white/90">
                    {drama.network}
                  </span>
                </>
              )}

              {drama.releaseYear > 0 && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="flex-shrink-0 rounded-full bg-[#1c1c24] border border-white/[0.12] px-3 py-1 text-white/80">
                    {drama.releaseYear}
                  </span>
                </>
              )}

              {drama.rating > 0 && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="flex-shrink-0 flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-amber-300 font-bold">
                    <Star size={11} className="fill-amber-300 text-amber-300" />
                    {drama.rating.toFixed(1)}
                  </span>
                </>
              )}

              <span className="text-white/30">•</span>
              <span className="flex-shrink-0 rounded-full bg-[#1c1c24] border border-white/[0.12] px-3.5 py-1 text-white/80">
                {episodesLabel}
              </span>

              {drama.runtime && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="flex-shrink-0 rounded-full bg-[#1c1c24] px-3 py-1 text-white/60">
                    {drama.runtime} min/ep
                  </span>
                </>
              )}
            </div>

            {/* Segmented Status Pill Bar — Single sleek track with sliding active pill on PC */}
            <div className="mb-7">
              <div className="relative grid grid-cols-3 gap-1 p-1.5 rounded-full bg-white/[0.04] border border-white/10 select-none overflow-hidden max-md:backdrop-blur-none md:backdrop-blur-md">
                {/* Skiper UI Liquid Sliding Active Pill (PC only) */}
                <div
                  className={`hidden md:block absolute rounded-full shadow-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none ${
                    currentStatus === 'watchlist'
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 border border-sky-400/50 shadow-sky-900/40'
                      : currentStatus === 'watching'
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 border border-purple-400/50 shadow-purple-900/40'
                      : currentStatus === 'finished'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border border-emerald-400/50 shadow-emerald-900/40'
                      : 'opacity-0 scale-0'
                  }`}
                  style={{
                    width: 'calc((100% - 12px) / 3)',
                    height: 'calc(100% - 12px)',
                    top: '6px',
                    left: '6px',
                    transform:
                      currentStatus === 'watchlist'
                        ? 'translate3d(0%, 0, 0)'
                        : currentStatus === 'watching'
                        ? 'translate3d(100%, 0, 0)'
                        : currentStatus === 'finished'
                        ? 'translate3d(200%, 0, 0)'
                        : 'scale(0)',
                    opacity: currentStatus ? 1 : 0,
                  }}
                />

                <button
                  type="button"
                  onClick={() => handleStatusToggle('watchlist')}
                  className={`relative z-10 rounded-full py-2.5 px-2 text-center transition-all duration-150 cursor-pointer touch-manipulation active:scale-[0.98] border-0 outline-none ${
                    currentStatus === 'watchlist'
                      ? 'max-md:bg-gradient-to-r max-md:from-sky-500 max-md:to-blue-600 max-md:shadow-md max-md:shadow-sky-900/30 text-white font-bold'
                      : 'bg-transparent text-white/70 hover:text-white'
                  }`}
                >
                  <span className="relative z-10 inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm leading-none text-white">
                    <Bookmark size={15} strokeWidth={currentStatus === 'watchlist' ? 2.4 : 1.8} className={currentStatus === 'watchlist' ? 'text-white' : 'text-white/70'} />
                    <span className={currentStatus === 'watchlist' ? 'text-white font-bold' : 'text-white/80'}>Watchlist</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusToggle('watching')}
                  className={`relative z-10 rounded-full py-2.5 px-2 text-center transition-all duration-150 cursor-pointer touch-manipulation active:scale-[0.98] border-0 outline-none ${
                    currentStatus === 'watching'
                      ? 'max-md:bg-gradient-to-r max-md:from-purple-500 max-md:to-indigo-600 max-md:shadow-md max-md:shadow-purple-900/30 text-white font-bold'
                      : 'bg-transparent text-white/70 hover:text-white'
                  }`}
                >
                  <span className="relative z-10 inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm leading-none text-white">
                    <Play size={15} strokeWidth={currentStatus === 'watching' ? 2.4 : 1.8} className={currentStatus === 'watching' ? 'text-white' : 'text-white/70'} />
                    <span className={currentStatus === 'watching' ? 'text-white font-bold' : 'text-white/80'}>Watching</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusToggle('finished')}
                  className={`relative z-10 rounded-full py-2.5 px-2 text-center transition-all duration-150 cursor-pointer touch-manipulation active:scale-[0.98] border-0 outline-none ${
                    currentStatus === 'finished'
                      ? 'max-md:bg-gradient-to-r max-md:from-emerald-500 max-md:to-teal-500 max-md:shadow-md max-md:shadow-emerald-900/30 text-white font-bold'
                      : 'bg-transparent text-white/70 hover:text-white'
                  }`}
                >
                  <span className="relative z-10 inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm leading-none text-white">
                    <CheckCircle size={15} strokeWidth={currentStatus === 'finished' ? 2.4 : 1.8} className={currentStatus === 'finished' ? 'text-white' : 'text-white/70'} />
                    <span className={currentStatus === 'finished' ? 'text-white font-bold' : 'text-white/80'}>Finished</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Genres */}
            {drama.genres && drama.genres.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/35 mb-2.5">
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {drama.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-[#181820] border border-white/[0.12] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm hover:-translate-y-1 hover:scale-[1.04] active:scale-95 transition-all duration-250 ease-out cursor-default select-none"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Apple Store Style Tags in Title Case */}
            {drama.tags && drama.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/35 mb-2.5">
                  Themes & Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {drama.tags.slice(0, 14).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-[#181820]/80 border border-white/[0.08] px-3.5 py-1 text-xs font-medium text-white/80 hover:-translate-y-1 hover:scale-[1.04] active:scale-95 transition-all duration-250 ease-out cursor-default select-none"
                    >
                      {toTitleCase(t)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Synopsis */}
            {drama.synopsis && (
              <div className="mb-7">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/35 mb-2.5">
                  Storyline
                </h3>
                <div className="rounded-[24px] bg-[#14141c] border border-white/[0.10] p-5 leading-relaxed text-[15px] text-white/85 shadow-lg">
                  <p>{drama.synopsis}</p>
                </div>
              </div>
            )}

            {/* High-Res Photo Gallery with Lightbox */}
            {allImages.length > 0 && (
              <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/35">
                    Stills & Posters
                  </h3>
                  <span className="text-xs text-white/30">{allImages.length} Photos</span>
                </div>
                <div
                  ref={galleryRef}
                  className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-6 px-6"
                >
                  {allImages.slice(0, 24).map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxSrc(resolveImageUrl(img.file_path, 'original'))}
                      className="group relative h-36 w-26 flex-shrink-0 overflow-hidden rounded-[20px] border border-white/[0.14] bg-[#161620] shadow-lg hover:-translate-y-1 hover:scale-[1.04] active:scale-95 transition-all duration-250 ease-out cursor-pointer touch-manipulation"
                    >
                      <SafeImage
                        src={resolveImageUrl(img.file_path, 'w500')}
                        size="w500"
                        alt="Drama Still"
                        fill
                        loading="lazy"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                        <Maximize2
                          size={18}
                          className="text-white opacity-0 transition group-hover:opacity-100"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Directors */}
            {drama.directors && drama.directors.length > 0 && (
              <div className="mb-7">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/35 mb-3">
                  Direction
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {drama.directors.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => onPersonClick(d.id, d.name)}
                      className="flex items-center gap-2.5 rounded-full bg-[#181822] border border-white/[0.12] px-4 py-2 hover:bg-white/[0.12] transition active:scale-95 cursor-pointer touch-manipulation"
                    >
                      {d.profile_path ? (
                        <div className="relative h-6 w-6 overflow-hidden rounded-full border border-white/20">
                          <SafeImage
                            src={resolveImageUrl(d.profile_path, 'w185')}
                            size="w185"
                            alt={d.name}
                            fill
                            loading="lazy"
                            className="object-cover"
                            fallbackText="?"
                          />
                        </div>
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50">
                          ?
                        </div>
                      )}
                      <span className="text-xs font-semibold text-white/90">{d.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cast List */}
            {drama.cast && drama.cast.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/35 mb-3.5">
                  Main & Supporting Cast
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-6 px-6">
                  {drama.cast.slice(0, 20).map((c) => (
                    <button
                      key={`${c.id}-${c.order}`}
                      onClick={() => onPersonClick(c.id, c.name)}
                      className="group flex flex-col items-center gap-2 flex-shrink-0 w-22 text-center hover:-translate-y-1 hover:scale-[1.04] active:scale-95 transition-all duration-250 ease-out cursor-pointer touch-manipulation select-none"
                    >
                      <div className="relative h-22 w-22 overflow-hidden rounded-[22px] border border-white/[0.16] bg-[#161620] shadow-lg transition duration-200 group-hover:border-white/40 group-hover:scale-[1.03]">
                        {c.profile_path ? (
                          <SafeImage
                            src={resolveImageUrl(c.profile_path, 'w185')}
                            size="w185"
                            alt={c.name}
                            fill
                            loading="lazy"
                            className="object-cover"
                            fallbackText="?"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/20 text-xs font-medium">
                            ?
                          </div>
                        )}
                      </div>
                      <div className="w-full">
                        <div className="text-xs font-semibold text-white/90 truncate leading-tight">
                          {c.name}
                        </div>
                        {c.character && (
                          <div className="text-[11px] text-white/40 truncate leading-tight mt-0.5">
                            {c.character}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
