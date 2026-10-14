'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Bookmark, Play, CheckCircle, Star, Calendar,
  Clock, Tv, Globe, Maximize2, Loader2, Sparkles
} from 'lucide-react'
import type { Drama, TmdbCastMember, TmdbCrewMember, TmdbImage } from '@/lib/tmdb'
import { addDrama, moveDrama, getUserDramas, type DramaStatus } from '@/lib/supabase/archive'

interface DramaDetailSheetProps {
  tmdbId: number
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

export default function DramaDetailSheet({ tmdbId, onClose, onPersonClick }: DramaDetailSheetProps) {
  const [drama, setDrama] = useState<Drama | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStatus, setCurrentStatus] = useState<DramaStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/drama/${tmdbId}`)
      .then((r) => r.json())
      .then((d) => {
        setDrama(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [tmdbId])

  useEffect(() => {
    getUserDramas().then((dramas) => {
      const found = dramas.find((d) => d.tmdb_id === tmdbId)
      setCurrentStatus(found?.status ?? null)
    })
  }, [tmdbId])

  async function setStatus(status: DramaStatus) {
    if (!drama) return
    setCurrentStatus(status)
    setStatusLoading(true)
    if (currentStatus) {
      await moveDrama(drama.dramaId, status)
    } else {
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
    }
    setStatusLoading(false)
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
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-md"
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
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4"
            onClick={() => setLightboxSrc(null)}
          >
            <button
              className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-xl border border-white/20 transition hover:bg-white/20 active:scale-95"
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

      {/* iOS Sheet with Ambient Poster Glow */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="relative flex h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[36px] border-t border-white/[0.18] bg-[#07070a] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.9)] will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hardware-accelerated radial ambient layer (60 FPS on mobile GPUs) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(88,28,135,0.28),_transparent_70%)]" />
        </div>

        {/* Drag handle */}
        <div className="relative z-10 flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-white/25" />
        </div>

        {/* iOS Close button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.16] bg-black/40 text-white/70 backdrop-blur-xl transition hover:bg-white/20 hover:text-white active:scale-90"
        >
          <X size={17} />
        </button>

        {loading ? (
          <div className="relative z-10 flex flex-1 items-center justify-center">
            <div className="h-11 w-11 animate-spin rounded-full border-2 border-white/10 border-t-purple-400" />
          </div>
        ) : !drama ? (
          <div className="relative z-10 flex flex-1 items-center justify-center text-white/40">
            Failed to load drama details.
          </div>
        ) : (
          <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-36 pt-2 scrollbar-hide">
            
            {/* Hero Backdrop */}
            {drama.backdropUrl && (
              <div className="relative -mx-6 -mt-2 mb-6 h-60 w-[calc(100%+3rem)] overflow-hidden">
                <Image
                  src={drama.backdropUrl}
                  alt={drama.title}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07070a] via-[#07070a]/40 to-transparent" />
              </div>
            )}

            {/* Poster + Title Section */}
            <div className={`flex gap-5 items-end mb-6 ${drama.backdropUrl ? '-mt-24 relative z-10' : 'mt-2'}`}>
              <div className="relative h-44 w-30 flex-shrink-0 overflow-hidden rounded-[22px] border border-white/[0.22] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.3)] bg-black/60">
                {drama.posterUrl ? (
                  <Image
                    src={drama.posterUrl}
                    alt={drama.title}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/20 text-xs">
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
                <span className="flex-shrink-0 rounded-full bg-white/[0.14] border border-white/[0.18] px-3.5 py-1 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-md">
                  {regionBadge}
                </span>
              )}

              {drama.network && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="flex-shrink-0 rounded-full bg-white/[0.12] border border-white/[0.14] px-3.5 py-1 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md">
                    {drama.network}
                  </span>
                </>
              )}

              {drama.releaseYear > 0 && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="flex-shrink-0 rounded-full bg-white/[0.10] border border-white/[0.12] px-3 py-1 text-white/80 backdrop-blur-md">
                    {drama.releaseYear}
                  </span>
                </>
              )}

              {drama.rating > 0 && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="flex-shrink-0 flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-amber-300 backdrop-blur-md font-bold">
                    <Star size={11} className="fill-amber-300 text-amber-300" />
                    {drama.rating.toFixed(1)}
                  </span>
                </>
              )}

              <span className="text-white/30">•</span>
              <span className="flex-shrink-0 rounded-full bg-white/[0.10] border border-white/[0.12] px-3.5 py-1 text-white/80 backdrop-blur-md">
                {episodesLabel}
              </span>

              {drama.runtime && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="flex-shrink-0 rounded-full bg-white/[0.08] px-3 py-1 text-white/60">
                    {drama.runtime} min/ep
                  </span>
                </>
              )}
            </div>

            {/* iOS 18 Sliding Segmented Control */}
            <div className="mb-7">
              <div className="rounded-full bg-black/50 backdrop-blur-2xl p-1.5 border border-white/[0.14] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] flex items-center gap-1">
                {(
                  [
                    {
                      status: 'watchlist' as DramaStatus,
                      label: 'Watchlist',
                      icon: Bookmark,
                      activeClass:
                        'bg-gradient-to-b from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 font-semibold',
                    },
                    {
                      status: 'watching' as DramaStatus,
                      label: 'Watching',
                      icon: Play,
                      activeClass:
                        'bg-gradient-to-b from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30 font-semibold',
                    },
                    {
                      status: 'finished' as DramaStatus,
                      label: 'Finished',
                      icon: CheckCircle,
                      activeClass:
                        'bg-gradient-to-b from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/30 font-semibold',
                    },
                  ] as const
                ).map(({ status, label, icon: Icon, activeClass }) => {
                  const isActive = currentStatus === status
                  return (
                    <motion.button
                      key={status}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStatus(status)}
                      disabled={statusLoading}
                      className={`relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-3 text-xs tracking-wide transition-all duration-200 cursor-pointer ${
                        isActive
                          ? activeClass
                          : 'text-white/55 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <Icon
                        size={14}
                        fill={isActive && status === 'watchlist' ? 'currentColor' : 'none'}
                        strokeWidth={isActive ? 2.4 : 1.8}
                      />
                      <span>{label}</span>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Apple Music Style Genres */}
            {drama.genres && drama.genres.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/35 mb-2.5">
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {drama.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-white/[0.12] border border-white/[0.15] px-4 py-1.5 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-md"
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
                      className="rounded-full bg-white/[0.06] border border-white/[0.10] px-3.5 py-1 text-xs font-medium text-white/80 backdrop-blur-sm"
                    >
                      {toTitleCase(t)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Synopsis in Inset iOS Glass Card */}
            {drama.synopsis && (
              <div className="mb-7">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/35 mb-2.5">
                  Storyline
                </h3>
                <div className="ios-glass-card rounded-[24px] p-5 leading-relaxed text-[15px] text-white/85 shadow-lg">
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
                      onClick={() => setLightboxSrc(`https://image.tmdb.org/t/p/original${img.file_path}`)}
                      className="group relative h-36 w-26 flex-shrink-0 overflow-hidden rounded-[20px] border border-white/[0.14] bg-white/[0.05] shadow-lg transition duration-200 hover:scale-[1.03] active:scale-95 cursor-pointer"
                    >
                      <Image
                        src={`https://image.tmdb.org/t/p/w780${img.file_path}`}
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
                      className="ios-glass-pill flex items-center gap-2.5 rounded-full px-4 py-2 hover:bg-white/[0.18] transition active:scale-95 cursor-pointer"
                    >
                      {d.profile_path ? (
                        <div className="relative h-6 w-6 overflow-hidden rounded-full border border-white/20">
                          <Image
                            src={`https://image.tmdb.org/t/p/w342${d.profile_path}`}
                            alt={d.name}
                            fill
                            loading="lazy"
                            className="object-cover"
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
                      className="group flex flex-col items-center gap-2 flex-shrink-0 w-22 text-center transition active:scale-95 cursor-pointer"
                    >
                      <div className="relative h-22 w-22 overflow-hidden rounded-[22px] border border-white/[0.16] bg-white/[0.05] shadow-lg transition duration-200 group-hover:border-white/40 group-hover:scale-[1.03]">
                        {c.profile_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w342${c.profile_path}`}
                            alt={c.name}
                            fill
                            loading="lazy"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/20 text-xs">
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
