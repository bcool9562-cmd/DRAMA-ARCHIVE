'use client'

/**
 * NavStackModal — unified iOS-style navigation stack.
 *
 * • Only the TOP item is ever rendered (no hidden layers behind it).
 * • Every push calls window.history.pushState so Android back / iOS swipe-back
 *   pop exactly ONE page at a time.
 * • Supports 'drama', 'person', 'photos', and 'cast' dedicated stack pages.
 * • Fetched drama/person data is cached in a client-side Map so going back is
 *   instant and never re-fetches from the network.
 * • Zero-GPU-cost Apple dark glass surfaces with native iOS momentum scrolling.
 */

import { useEffect, useRef, useCallback, useState, useReducer } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  X, ChevronLeft, Bookmark, Play, CheckCircle, Star,
  Maximize2, Loader2, Calendar, Images, Users, ChevronRight,
} from 'lucide-react'
import type { Drama, TmdbPersonDetail, TmdbPersonCredit, TmdbImage, TmdbCastMember, TmdbCrewMember } from '@/lib/tmdb'
import VibeChart from '@/components/vibe/VibeChart'
import {
  addDrama, moveDrama, removeDrama, getUserDramas,
  getSavedDramasSync, onArchiveSync,
  type DramaStatus, type UserDrama,
} from '@/lib/supabase/archive'
import { REGION_NAMES } from '@/components/drama/DramaDetailSheet'
import { haptic } from '@/lib/haptics'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StackItem =
  | { type: 'drama'; id: number; preview?: Partial<Drama> | UserDrama | null }
  | { type: 'person'; id: number; name?: string }
  | { type: 'photos'; id: number; dramaTitle: string; photos: TmdbImage[] }
  | { type: 'cast'; id: number; dramaTitle: string; cast: TmdbCastMember[]; directors: TmdbCrewMember[] }

interface NavStackModalProps {
  /** External initial stack items (e.g. from a list-tab card click) */
  initialStack?: StackItem[]
  /** Called when stack becomes empty so parent can clear its selection */
  onEmpty: () => void
  /** Called each time a new page is pushed so parent knows the current depth */
  onStackChange?: (depth: number) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function normalizeDramaPreview(
  init: Partial<Drama> | UserDrama | null | undefined,
  tmdbId: number
): Drama {
  if (!init) return { tmdbId, dramaId: `tmdb-${tmdbId}` } as Drama
  const isUser = 'drama_id' in init
  return {
    tmdbId,
    dramaId: isUser ? (init as UserDrama).drama_id : (init as Drama).dramaId || `tmdb-${tmdbId}`,
    title: (isUser ? (init as UserDrama).title : (init as Drama).title) || '',
    nativeTitle: (isUser ? (init as UserDrama).native_title : (init as Drama).nativeTitle) || '',
    posterUrl: (isUser ? (init as UserDrama).poster_url : (init as Drama).posterUrl) || '',
    backdropUrl: (init as any).backdropUrl || (init as any).backdrop_url || '',
    country: (isUser ? (init as UserDrama).country : (init as Drama).country) || 'KR',
    releaseYear: (isUser ? (init as UserDrama).release_year : (init as Drama).releaseYear) || 0,
    totalEpisodes: (isUser ? (init as UserDrama).total_episodes : (init as Drama).totalEpisodes) || 0,
    rating: (isUser ? (init as UserDrama).rating : (init as Drama).rating) || 0,
    synopsis: (init as any).synopsis || '',
    airingStatus: (isUser ? (init as UserDrama).airing_status : (init as Drama).airingStatus) || 'completed',
    firstAirDate: (isUser ? (init as UserDrama).first_air_date : (init as Drama).firstAirDate) || '',
    lastAirDate: (init as any).lastAirDate || '',
    nextEpisodeDate: (isUser ? (init as UserDrama).next_episode_date : (init as Drama).nextEpisodeDate) || null,
    nextEpisodeNumber: (isUser ? (init as UserDrama).next_episode_number : (init as Drama).nextEpisodeNumber) || null,
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NavStackModal({ initialStack, onEmpty, onStackChange }: NavStackModalProps) {
  // Stack of pages — only the last item is rendered
  const [stack, setStack] = useState<StackItem[]>(initialStack || [])

  // Client-side detail cache (survive back navigation without re-fetching)
  const dramaCache = useRef<Map<number, Drama>>(new Map())
  const personCache = useRef<Map<number, TmdbPersonDetail>>(new Map())

  // Saved dramas for single-source-of-truth status
  const [savedDramas, setSavedDramas] = useState<UserDrama[]>(() => getSavedDramasSync())

  // Lightbox state for gallery with thumbnail persistence & smooth 4K fade-in
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [lightboxThumb, setLightboxThumb] = useState<string | null>(null)
  const [lightboxLoaded, setLightboxLoaded] = useState(false)

  const openLightbox = useCallback((src: string, thumb?: string) => {
    setLightboxSrc(src)
    setLightboxThumb(thumb || src.replace('/original/', '/w780/'))
    setLightboxLoaded(false)
  }, [])

  // Force re-render when cache updates (shallow ref, need a trigger)
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  // ── Sync saved dramas ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onArchiveSync(setSavedDramas)
    return unsub
  }, [])

  // ── Update parent depth ────────────────────────────────────────────────────
  useEffect(() => {
    onStackChange?.(stack.length)
    if (stack.length === 0) onEmpty()
  }, [stack, onEmpty, onStackChange])

  // ── Sync initial stack when prop changes ──────────────────────────────────
  useEffect(() => {
    if (initialStack && initialStack.length > 0) {
      setStack(initialStack)
      initialStack.forEach((_, i) => {
        window.history.pushState({ navDepth: i + 1 }, '')
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStack?.length ?? 0, initialStack?.[0]?.id])

  // ── popstate: step back exactly one page ─────────────────────────────────
  useEffect(() => {
    function onPopState() {
      setStack(prev => {
        if (prev.length <= 1) return []
        return prev.slice(0, -1)
      })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // ── Push helpers ───────────────────────────────────────────────────────────
  const pushDrama = useCallback((id: number, preview?: Partial<Drama> | UserDrama | null) => {
    (document.activeElement as HTMLElement)?.blur()
    setStack(prev => {
      const next: StackItem[] = [...prev, { type: 'drama', id, preview }]
      window.history.pushState({ navDepth: next.length }, '')
      return next
    })
  }, [])

  const pushPerson = useCallback((id: number, name?: string) => {
    (document.activeElement as HTMLElement)?.blur()
    setStack(prev => {
      const next: StackItem[] = [...prev, { type: 'person', id, name }]
      window.history.pushState({ navDepth: next.length }, '')
      return next
    })
  }, [])

  const pushPhotos = useCallback((dramaId: number, dramaTitle: string, photos: TmdbImage[]) => {
    (document.activeElement as HTMLElement)?.blur()
    setStack(prev => {
      const next: StackItem[] = [...prev, { type: 'photos', id: dramaId, dramaTitle, photos }]
      window.history.pushState({ navDepth: next.length }, '')
      return next
    })
  }, [])

  const pushCast = useCallback((dramaId: number, dramaTitle: string, cast: TmdbCastMember[], directors: TmdbCrewMember[]) => {
    (document.activeElement as HTMLElement)?.blur()
    setStack(prev => {
      const next: StackItem[] = [...prev, { type: 'cast', id: dramaId, dramaTitle, cast, directors }]
      window.history.pushState({ navDepth: next.length }, '')
      return next
    })
  }, [])

  const popOne = useCallback(() => {
    window.history.back()
  }, [])

  const closeAll = useCallback(() => {
    const depth = stack.length
    for (let i = 0; i < depth; i++) window.history.back()
    setStack([])
  }, [stack.length])

  // ── Current view ──────────────────────────────────────────────────────────
  const current = stack[stack.length - 1]
  const prevItem = stack[stack.length - 2]
  const backLabel = prevItem
    ? prevItem.type === 'drama'
      ? ((dramaCache.current.get(prevItem.id)?.title) || 'Back')
      : prevItem.type === 'person'
      ? ((personCache.current.get(prevItem.id)?.name) || prevItem.name || 'Back')
      : prevItem.dramaTitle || 'Back'
    : 'Close'

  if (!current) return null

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 select-none"
            onClick={() => { setLightboxSrc(null); setLightboxThumb(null) }}
          >
            <button
              className="absolute right-6 top-6 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-xl border border-white/20 transition hover:bg-white/20 active:scale-95 cursor-pointer touch-manipulation"
              onClick={() => { setLightboxSrc(null); setLightboxThumb(null) }}
            >
              <X size={20} />
            </button>
            <div className="relative h-[85vh] w-full max-w-4xl flex items-center justify-center">
              {/* Dimmed thumbnail behind while 4K loads */}
              {lightboxThumb && !lightboxLoaded && (
                <Image
                  src={lightboxThumb}
                  alt="Gallery Thumbnail"
                  fill
                  className="object-contain opacity-35 blur-sm pointer-events-none"
                  priority
                />
              )}

              {/* Minimal white partial-ring spinner matching Photo 3 */}
              {!lightboxLoaded && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200 pointer-events-none">
                  <div className="w-9 h-9 rounded-full border-[2.5px] border-white/15 border-t-white animate-spin" />
                </div>
              )}

              <Image
                src={lightboxSrc}
                alt="Gallery Still"
                fill
                sizes="(max-width: 1024px) 100vw, 1200px"
                className={`object-contain transition-opacity duration-300 ${lightboxLoaded ? 'opacity-100' : 'opacity-0'}`}
                priority
                onLoad={() => setLightboxLoaded(true)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${current.type}-${current.id}`}
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0 flex items-end justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) popOne() }}
        >
          {current.type === 'drama' ? (
            <DramaPage
              key={`drama-${current.id}`}
              tmdbId={current.id}
              preview={current.preview}
              dramaCache={dramaCache.current}
              savedDramas={savedDramas}
              backLabel={backLabel}
              canGoBack={stack.length > 1}
              onBack={popOne}
              onClose={closeAll}
              onPersonClick={pushPerson}
              onPushPhotos={pushPhotos}
              onPushCast={pushCast}
              onForceUpdate={forceUpdate}
              setLightboxSrc={openLightbox}
            />
          ) : current.type === 'person' ? (
            <PersonPage
              key={`person-${current.id}`}
              personId={current.id}
              personCache={personCache.current}
              backLabel={backLabel}
              canGoBack={stack.length > 1}
              onBack={popOne}
              onClose={closeAll}
              onDramaClick={(id) => pushDrama(id)}
              onForceUpdate={forceUpdate}
            />
          ) : current.type === 'photos' ? (
            <PhotosGridPage
              key={`photos-${current.id}`}
              photos={current.photos}
              dramaTitle={current.dramaTitle}
              backLabel={backLabel}
              canGoBack={stack.length > 1}
              onBack={popOne}
              onClose={closeAll}
              setLightboxSrc={openLightbox}
            />
          ) : (
            <CastGridPage
              key={`cast-${current.id}`}
              cast={current.cast}
              directors={current.directors}
              dramaTitle={current.dramaTitle}
              backLabel={backLabel}
              canGoBack={stack.length > 1}
              onBack={popOne}
              onClose={closeAll}
              onPersonClick={pushPerson}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Drama Page ───────────────────────────────────────────────────────────────

interface DramaPageProps {
  tmdbId: number
  preview?: Partial<Drama> | UserDrama | null
  dramaCache: Map<number, Drama>
  savedDramas: UserDrama[]
  backLabel: string
  canGoBack: boolean
  onBack: () => void
  onClose: () => void
  onPersonClick: (id: number, name: string) => void
  onPushPhotos: (dramaId: number, title: string, photos: TmdbImage[]) => void
  onPushCast: (dramaId: number, title: string, cast: TmdbCastMember[], directors: TmdbCrewMember[]) => void
  onForceUpdate: () => void
  setLightboxSrc: (src: string, thumb?: string) => void
}

function DramaPage({
  tmdbId, preview, dramaCache, savedDramas,
  backLabel, canGoBack, onBack, onClose, onPersonClick,
  onPushPhotos, onPushCast,
  onForceUpdate, setLightboxSrc,
}: DramaPageProps) {
  const cached = dramaCache.get(tmdbId)
  const [drama, setDrama] = useState<Drama | null>(cached ?? (() => normalizeDramaPreview(preview, tmdbId)))
  const [loading, setLoading] = useState(!cached)
  const [backdropLoaded, setBackdropLoaded] = useState(false)

  // Background fetch for rich data
  useEffect(() => {
    if (dramaCache.has(tmdbId) && (dramaCache.get(tmdbId)?.cast?.length ?? 0) > 0) {
      setDrama(dramaCache.get(tmdbId)!)
      setLoading(false)
      return
    }
    let alive = true
    fetch(`/api/drama/${tmdbId}`)
      .then(r => r.json())
      .then(d => {
        if (!alive || !d) return
        dramaCache.set(tmdbId, d)
        setDrama(d)
        setLoading(false)
        onForceUpdate()
      })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbId])

  // Single source of truth for user drama status with optimistic locking
  const mutationIdRef = useRef(0)
  const [lockedStatus, setLockedStatus] = useState<DramaStatus | null | undefined>(undefined)

  useEffect(() => {
    setLockedStatus(undefined)
  }, [tmdbId])

  const userDrama = savedDramas.find(d => d.tmdb_id === tmdbId)
  const currentStatus = lockedStatus !== undefined ? lockedStatus : (userDrama?.status ?? null)

  const handleStatusToggle = (target: DramaStatus) => {
    if (!drama) return
    mutationIdRef.current += 1
    const nextStatus = currentStatus === target ? null : target
    setLockedStatus(nextStatus)

    if (nextStatus === 'finished') {
      haptic.success()
    } else if (nextStatus) {
      haptic.medium()
    } else {
      haptic.warning()
    }

    if (currentStatus === target) {
      removeDrama(drama.dramaId)
    } else if (currentStatus) {
      moveDrama(drama.dramaId, target)
    } else {
      addDrama({
        drama_id: drama.dramaId,
        tmdb_id: drama.tmdbId,
        title: drama.title,
        native_title: drama.nativeTitle,
        poster_url: drama.posterUrl,
        country: drama.country,
        release_year: drama.releaseYear,
        total_episodes: drama.totalEpisodes,
        rating: drama.rating,
        status: target,
        airing_status: drama.airingStatus,
        first_air_date: drama.firstAirDate,
        next_episode_date: drama.nextEpisodeDate,
        next_episode_number: drama.nextEpisodeNumber,
      })
    }
  }

  const regionBadge = drama?.country ? REGION_NAMES[drama.country]?.badge || drama.country : null
  const episodesLabel = drama?.totalEpisodes ? `${drama.totalEpisodes} Episodes` : 'Episodes TBA'

  const pills: {
    status: DramaStatus
    label: string
    icon: typeof Bookmark
    activeGradient: string
  }[] = [
    {
      status: 'watchlist',
      label: 'Watchlist',
      icon: Bookmark,
      activeGradient: 'bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-lg shadow-blue-500/35 border-sky-300/40',
    },
    {
      status: 'watching',
      label: 'Watching',
      icon: Play,
      activeGradient: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/35 border-purple-300/40',
    },
    {
      status: 'finished',
      label: 'Finished',
      icon: CheckCircle,
      activeGradient: 'bg-gradient-to-r from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/35 border-emerald-300/40',
    },
  ]

  const pillRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [statusIndicator, setStatusIndicator] = useState<{ left: number; top: number; width: number; height: number; ready: boolean }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    ready: false,
  })

  useEffect(() => {
    const updateIndicator = () => {
      const activeIdx = pills.findIndex(p => p.status === currentStatus)
      const activeBtn = pillRefs.current[activeIdx]
      if (activeBtn) {
        setStatusIndicator({
          left: activeBtn.offsetLeft,
          top: activeBtn.offsetTop,
          width: activeBtn.offsetWidth,
          height: activeBtn.offsetHeight,
          ready: true,
        })
      }
    }
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [currentStatus])

  // Image limits for smooth mobile performance
  const allImages = [...(drama?.images ?? []), ...(drama?.backdrops ?? [])]
  const visibleImages = allImages.slice(0, 12)
  const visibleCast = (drama?.cast ?? []).slice(0, 15)

  return (
    <div
      className="relative flex h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[36px] border-t border-white/[0.22] bg-[#0c0c12]/95 backdrop-blur-2xl shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.9)] will-change-transform transform-gpu"
      onClick={e => e.stopPropagation()}
    >
      {/* Ambient background poster glow */}
      {drama?.posterUrl && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <Image
            src={drama.posterUrl}
            alt="Ambient Glow"
            fill
            priority
            className="scale-150 blur-[100px] saturate-200 opacity-20 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c12]/30 via-[#0c0c12]/80 to-[#0c0c12]" />
        </div>
      )}

      {/* Drag handle */}
      <div className="relative z-10 flex justify-center pt-3 pb-0">
        <div className="h-1.5 w-12 rounded-full bg-white/25" />
      </div>

      {/* Nav bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-2 pb-0 min-h-[44px]">
        {canGoBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.18] bg-white/[0.08] backdrop-blur-xl px-3 py-1.5 text-xs font-semibold text-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] hover:bg-white/[0.14] active:scale-95 transition cursor-pointer touch-manipulation select-none"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white">
              <ChevronLeft size={13} strokeWidth={2.5} />
            </span>
            <span className="max-w-[130px] truncate">{backLabel}</span>
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={canGoBack ? onBack : onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.18] bg-white/[0.08] backdrop-blur-xl text-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] hover:bg-white/[0.14] hover:text-white active:scale-90 transition cursor-pointer touch-manipulation"
        >
          <X size={17} strokeWidth={2.2} />
        </button>
      </div>

      {/* Scrollable body */}
      {loading && !drama?.title ? (
        <div className="flex flex-1 items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-9 h-9 rounded-full border-[2.5px] border-white/15 border-t-white animate-spin" />
        </div>
      ) : !drama ? (
        <div className="relative z-10 flex flex-1 items-center justify-center text-white/40">Failed to load drama.</div>
      ) : (
        <div
          className="relative z-10 flex-1 overflow-y-auto px-6 pb-36 pt-2 scrollbar-hide overscroll-y-contain will-change-scroll transform-gpu"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
        >
          {/* Hero Backdrop */}
          {drama.backdropUrl && (
            <div className="relative -mx-6 -mt-2 mb-6 h-56 w-[calc(100%+3rem)] overflow-hidden bg-black/60">
              <Image
                src={drama.backdropUrl}
                alt={drama.title}
                fill
                sizes="(max-width: 672px) 100vw, 672px"
                decoding="async"
                priority
                onLoad={() => setBackdropLoaded(true)}
                className={`object-cover transition-opacity duration-300 ${backdropLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c12] via-[#0c0c12]/40 to-transparent" />
            </div>
          )}

          {/* Poster + Title */}
          <div className={`flex gap-5 items-end mb-6 ${drama.backdropUrl ? '-mt-24 relative z-10' : 'mt-2'}`}>
            <div className="relative h-44 w-30 flex-shrink-0 overflow-hidden rounded-[22px] border border-white/[0.22] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.3)] bg-black/60">
              {drama.posterUrl ? (
                <Image src={drama.posterUrl} alt={drama.title} fill sizes="120px" priority className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/20 text-xs">No Poster</div>
              )}
            </div>
            <div className="flex flex-col justify-end flex-1 min-w-0 pb-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-white leading-tight">{drama.title}</h1>
              {drama.nativeTitle && (
                <p className="text-sm font-medium text-white/55 mt-1 leading-snug">{drama.nativeTitle}</p>
              )}
            </div>
          </div>

          {/* Metadata Ribbon */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide text-xs font-semibold">
            {regionBadge && (
              <span className="flex-shrink-0 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.16] px-3.5 py-1 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)]">
                {regionBadge}
              </span>
            )}
            {drama.network && (
              <>
                <span className="text-white/30">•</span>
                <span className="flex-shrink-0 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.14] px-3.5 py-1 text-white/90">
                  {drama.network}
                </span>
              </>
            )}
            {drama.releaseYear > 0 && (
              <>
                <span className="text-white/30">•</span>
                <span className="flex-shrink-0 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] px-3.5 py-1 text-white/80">
                  {drama.releaseYear}
                </span>
              </>
            )}
            {drama.rating > 0 && (
              <>
                <span className="text-white/30">•</span>
                <span className="flex-shrink-0 flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.25)]">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  {drama.rating.toFixed(1)}
                </span>
              </>
            )}
            <span className="text-white/30">•</span>
            <span className="flex-shrink-0 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] px-3.5 py-1 text-white/80">
              {episodesLabel}
            </span>
            {drama.runtime && (
              <>
                <span className="text-white/30">•</span>
                <span className="flex-shrink-0 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.10] px-3 py-1 text-white/60">
                  {drama.runtime} min/ep
                </span>
              </>
            )}
          </div>

          {/* Segmented Status Pill Bar */}
          <div className="mb-6">
            <div className="relative rounded-full bg-white/[0.06] backdrop-blur-2xl border border-white/[0.14] p-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] flex items-center gap-1.5 touch-manipulation select-none overflow-hidden">
              {/* Skiper UI Liquid Sliding Active Status Pill */}
              <div
                className="pointer-events-none absolute rounded-full border border-white/20 shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  top: statusIndicator.top,
                  left: 0,
                  width: statusIndicator.width,
                  height: statusIndicator.height,
                  transform: `translate3d(${statusIndicator.left}px, 0, 0)`,
                  opacity: currentStatus && statusIndicator.ready ? 1 : 0,
                  transitionProperty: 'transform, width, height, opacity, background',
                  background: currentStatus === 'watchlist'
                    ? 'linear-gradient(to right, rgb(14 165 233), rgb(37 99 235))'
                    : currentStatus === 'watching'
                    ? 'linear-gradient(to right, rgb(168 85 247), rgb(79 70 229))'
                    : currentStatus === 'finished'
                    ? 'linear-gradient(to right, rgb(16 185 129), rgb(13 148 136))'
                    : 'transparent',
                }}
              />

              {pills.map(({ status, label, icon: Icon }, idx) => {
                const isActive = currentStatus === status
                return (
                  <button
                    key={status}
                    ref={(el) => { pillRefs.current[idx] = el }}
                    type="button"
                    onClick={() => handleStatusToggle(status)}
                    className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 px-3 text-xs font-semibold tracking-wide transition-colors duration-150 cursor-pointer touch-manipulation select-none active:scale-95 ${isActive ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                  >
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Icon size={13} strokeWidth={isActive ? 2.4 : 1.8} />
                      <span>{label}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Genres */}
          {drama.genres && drama.genres.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/35 mb-2.5">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {drama.genres.map(g => (
                  <span key={g} className="rounded-full bg-[#181820] border border-white/[0.12] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm hover:-translate-y-1 hover:scale-[1.04] active:scale-95 transition-all duration-250 ease-out cursor-default select-none">{g}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {drama.tags && drama.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/35 mb-2.5">Themes & Tags</h3>
              <div className="flex flex-wrap gap-2">
                {drama.tags.slice(0, 14).map(t => (
                  <span key={t} className="rounded-full bg-[#181820]/80 border border-white/[0.08] px-3.5 py-1 text-xs font-medium text-white/80 hover:-translate-y-1 hover:scale-[1.04] active:scale-95 transition-all duration-250 ease-out cursor-default select-none">{toTitleCase(t)}</span>
                ))}
              </div>
            </div>
          )}

          {/* Synopsis */}
          {drama.synopsis && (
            <div className="mb-7">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/35 mb-2.5">Storyline</h3>
              <div className="rounded-[24px] bg-[#14141c] border border-white/[0.10] p-5 leading-relaxed text-[15px] text-white/85 shadow-lg">
                <p>{drama.synopsis}</p>
              </div>
            </div>
          )}

          {/* Drama Vibe Chart (Moctale Aesthetic) */}
          <div className="mb-7">
            <VibeChart drama={drama} title="Drama Vibe Breakdown" subtitle="Aesthetic & Emotional Spectrum" />
          </div>

          {/* Gallery — Stills & Posters */}
          {allImages.length > 0 && (
            <div className="mb-7">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-baseline">
                  <h3 className="text-sm font-bold tracking-tight text-white">Stills & Posters</h3>
                  <span className="text-xs text-white/45 font-normal ml-1.5">{allImages.length}</span>
                </div>
                <button
                  onClick={() => onPushPhotos(tmdbId, drama.title, allImages)}
                  className="w-8 h-8 rounded-full bg-white/[0.14] hover:bg-white/[0.24] backdrop-blur-2xl border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center text-white active:scale-90 transition cursor-pointer touch-manipulation"
                >
                  <ChevronRight size={15} strokeWidth={2.4} />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-6 px-6" style={{ WebkitOverflowScrolling: 'touch' }}>
                {visibleImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxSrc(`https://image.tmdb.org/t/p/original${img.file_path}`, `https://image.tmdb.org/t/p/w780${img.file_path}`)}
                    className="group relative h-36 w-26 flex-shrink-0 overflow-hidden rounded-[20px] border border-white/[0.18] bg-[#161620] shadow-lg hover:-translate-y-1 hover:scale-[1.04] active:scale-95 transition-all duration-250 ease-out cursor-pointer touch-manipulation"
                  >
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${img.file_path}`}
                      alt="Drama Still"
                      fill
                      loading="lazy"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                      <Maximize2 size={18} className="text-white opacity-0 transition group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
                {allImages.length > 12 && (
                  <button
                    onClick={() => onPushPhotos(tmdbId, drama.title, allImages)}
                    className="relative h-36 w-26 flex-shrink-0 overflow-hidden rounded-[20px] border border-white/25 bg-[#161620] shadow-lg active:scale-95 transition-transform duration-150 cursor-pointer touch-manipulation group"
                  >
                    {allImages[12]?.file_path && (
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${allImages[12].file_path}`}
                        alt="Next still"
                        fill
                        className="object-cover scale-110 blur-sm"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl bg-white/[0.14] border border-white/25 flex flex-col items-center justify-center p-2 text-center">
                      <span className="text-lg font-black text-white tracking-tight">+{allImages.length - 12}</span>
                      <span className="text-[10px] font-bold text-white/85 mt-0.5 tracking-tight">View Gallery</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Directors */}
          {drama.directors && drama.directors.length > 0 && (
            <div className="mb-7">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/35 mb-3">Direction</h3>
              <div className="flex flex-wrap gap-2.5">
                {drama.directors.map(d => (
                  <button
                    key={d.id}
                    onClick={() => onPersonClick(d.id, d.name)}
                    className="flex items-center gap-2.5 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/20 px-4 py-2 hover:bg-white/[0.16] transition-transform duration-150 active:scale-95 cursor-pointer touch-manipulation shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                  >
                    {d.profile_path ? (
                      <div className="relative h-6 w-6 overflow-hidden rounded-full border border-white/25">
                        <Image src={`https://image.tmdb.org/t/p/w185${d.profile_path}`} alt={d.name} fill loading="lazy" className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50">?</div>
                    )}
                    <span className="text-xs font-semibold text-white/90">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cast */}
          {drama.cast && drama.cast.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-baseline">
                  <h3 className="text-sm font-bold tracking-tight text-white">Main & Supporting Cast</h3>
                  <span className="text-xs text-white/45 font-normal ml-1.5">{drama.cast.length}</span>
                </div>
                <button
                  onClick={() => onPushCast(tmdbId, drama.title, drama.cast!, drama.directors || [])}
                  className="w-8 h-8 rounded-full bg-white/[0.14] hover:bg-white/[0.24] backdrop-blur-2xl border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center text-white active:scale-90 transition cursor-pointer touch-manipulation"
                >
                  <ChevronRight size={15} strokeWidth={2.4} />
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-6 px-6" style={{ WebkitOverflowScrolling: 'touch' }}>
                {visibleCast.map(c => (
                  <button
                    key={`${c.id}-${c.order}`}
                    onClick={() => onPersonClick(c.id, c.name)}
                    className="group flex flex-col items-center gap-2 flex-shrink-0 w-22 text-center hover:-translate-y-1 hover:scale-[1.04] active:scale-95 transition-all duration-250 ease-out cursor-pointer touch-manipulation select-none"
                  >
                    <div className="relative h-22 w-22 overflow-hidden rounded-[22px] border border-white/[0.18] bg-[#161620] shadow-lg transition duration-200 group-hover:border-white/40">
                      {c.profile_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${c.profile_path}`}
                          alt={c.name}
                          fill
                          loading="lazy"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/20 text-xs">?</div>
                      )}
                    </div>
                    <div className="w-full">
                      <div className="text-xs font-semibold text-white/90 truncate leading-tight">{c.name}</div>
                      {c.character && (
                        <div className="text-[11px] text-white/40 truncate leading-tight mt-0.5">{c.character}</div>
                      )}
                    </div>
                  </button>
                ))}
                {drama.cast.length > 15 && (
                  <button
                    onClick={() => onPushCast(tmdbId, drama.title, drama.cast!, drama.directors || [])}
                    className="relative h-22 w-22 flex-shrink-0 overflow-hidden rounded-[22px] border border-white/25 bg-[#161620] shadow-lg active:scale-95 transition-transform duration-150 cursor-pointer touch-manipulation group"
                  >
                    {drama.cast[15]?.profile_path && (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${drama.cast[15].profile_path}`}
                        alt="Next cast"
                        fill
                        className="object-cover scale-110 blur-sm"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl bg-white/[0.14] border border-white/25 flex flex-col items-center justify-center p-1 text-center">
                      <span className="text-base font-black text-white tracking-tight">+{drama.cast.length - 15}</span>
                      <span className="text-[10px] font-bold text-white/85 mt-0.5 tracking-tight">All Cast</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Person Page ──────────────────────────────────────────────────────────────

interface PersonPageProps {
  personId: number
  personCache: Map<number, TmdbPersonDetail>
  backLabel: string
  canGoBack: boolean
  onBack: () => void
  onClose: () => void
  onDramaClick: (id: number) => void
  onForceUpdate: () => void
}

function PersonPage({ personId, personCache, backLabel, canGoBack, onBack, onClose, onDramaClick, onForceUpdate }: PersonPageProps) {
  const cached = personCache.get(personId)
  const [person, setPerson] = useState<TmdbPersonDetail | null>(cached ?? null)
  const [loading, setLoading] = useState(!cached)
  const [showFullBio, setShowFullBio] = useState(false)

  useEffect(() => {
    if (personCache.has(personId)) {
      setPerson(personCache.get(personId)!)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    fetch(`/api/person/${personId}`)
      .then(r => r.json())
      .then(d => {
        if (!alive || !d) return
        personCache.set(personId, d)
        setPerson(d)
        setLoading(false)
        onForceUpdate()
      })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId])

  const dedupedWorks: TmdbPersonCredit[] = []
  if (person?.combined_credits?.cast) {
    const seen = new Set<number>()
    const sorted = [...person.combined_credits.cast].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
    for (const w of sorted) {
      if (!seen.has(w.id)) { seen.add(w.id); dedupedWorks.push(w) }
    }
  }

  const bioFull = person?.biography ?? ''
  const bioPreview = bioFull.slice(0, 300)

  return (
    <div
      className="relative flex h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] border-t border-white/[0.22] bg-[#0c0c12]/95 backdrop-blur-2xl shadow-2xl will-change-transform transform-gpu"
      onClick={e => e.stopPropagation()}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-0 sm:hidden">
        <div className="h-1 w-10 rounded-full bg-white/20" />
      </div>

      {/* Nav bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-2 pb-0 min-h-[44px]">
        {canGoBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.18] bg-white/[0.08] backdrop-blur-xl px-3 py-1.5 text-xs font-semibold text-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] hover:bg-white/[0.14] active:scale-95 transition cursor-pointer touch-manipulation select-none"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white">
              <ChevronLeft size={13} strokeWidth={2.5} />
            </span>
            <span className="max-w-[120px] truncate">{backLabel}</span>
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={canGoBack ? onBack : onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.18] bg-white/[0.08] backdrop-blur-xl text-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] hover:bg-white/[0.14] hover:text-white active:scale-90 transition cursor-pointer touch-manipulation"
        >
          <X size={17} strokeWidth={2.2} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-9 h-9 rounded-full border-[2.5px] border-white/15 border-t-white animate-spin" />
        </div>
      ) : person ? (
        <div
          className="flex-1 overflow-y-auto px-5 pb-8 pt-4 scrollbar-hide overscroll-y-contain will-change-scroll"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
        >
          {/* Header */}
          <div className="flex gap-4 mb-5">
            <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-white/[0.05] shadow-lg">
              {person.profile_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                  alt={person.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                  loading="lazy"
                />
              ) : (
                <div className="h-full bg-white/[0.05] flex items-center justify-center text-white/20 text-xs">?</div>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="text-xl font-bold text-white tracking-tight">{person.name}</h2>
              <p className="text-xs text-white/40">{person.known_for_department}</p>
              {person.birthday && (
                <p className="text-xs text-white/30 mt-1 flex items-center gap-1">
                  <Calendar size={11} /> {person.birthday}
                  {person.place_of_birth && ` · ${person.place_of_birth}`}
                </p>
              )}
            </div>
          </div>

          {/* Biography */}
          {bioFull && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2">Biography</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                {showFullBio ? bioFull : (bioFull.length > 300 ? `${bioPreview}…` : bioFull)}
              </p>
              {bioFull.length > 300 && (
                <button
                  onClick={() => setShowFullBio(v => !v)}
                  className="mt-1 text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer touch-manipulation"
                >
                  {showFullBio ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* Other Works — w342 posters */}
          {dedupedWorks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-baseline">
                  <h3 className="text-sm font-bold tracking-tight text-white">Other Works</h3>
                  <span className="text-xs text-white/45 font-normal ml-1.5">{dedupedWorks.length} Titles</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {dedupedWorks.slice(0, 30).map(work => (
                  <PersonWorkCard key={work.id} work={work} onClick={() => onDramaClick(work.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-white/40">Failed to load profile.</div>
      )}
    </div>
  )
}

function PersonWorkCard({ work, onClick }: { work: TmdbPersonCredit; onClick: () => void }) {
  const title = work.name ?? work.title ?? ''
  const year = (work.first_air_date ?? work.release_date ?? '').slice(0, 4)
  const posterSrc = work.poster_path ? `https://image.tmdb.org/t/p/w342${work.poster_path}` : ''

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-1 rounded-2xl overflow-hidden border border-white/[0.08] bg-[#14141c]/95 hover:border-white/20 transition-transform duration-150 active:scale-95 group text-left cursor-pointer touch-manipulation"
    >
      <div className="relative aspect-[2/3] w-full bg-white/[0.05]">
        {posterSrc ? (
          <Image src={posterSrc} alt={title} fill className="object-cover" sizes="(max-width: 640px) 30vw, 120px" loading="lazy" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white/15 text-[10px]">No img</div>
        )}
      </div>
      <div className="p-2">
        <div className="text-[11px] font-semibold text-white/80 leading-tight line-clamp-1">{title}</div>
        <div className="flex items-center justify-between mt-1">
          {year && <span className="text-[10px] text-white/35">{year}</span>}
          {work.vote_average > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-300 font-bold">
              <Star size={9} className="fill-amber-300 text-amber-300" />
              {work.vote_average.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Photos Grid Page ─────────────────────────────────────────────────────────

function PhotosGridPage({
  photos, dramaTitle, backLabel, canGoBack, onBack, onClose, setLightboxSrc
}: {
  photos: TmdbImage[]; dramaTitle: string; backLabel: string
  canGoBack: boolean; onBack: () => void; onClose: () => void
  setLightboxSrc: (src: string, thumb?: string) => void
}) {
  return (
    <div
      className="relative flex h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[36px] border-t border-white/[0.22] bg-[#0c0c12]/95 backdrop-blur-2xl shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.9)] will-change-transform transform-gpu"
      onClick={e => e.stopPropagation()}
    >
      <div className="relative z-10 flex justify-center pt-3 pb-0">
        <div className="h-1.5 w-12 rounded-full bg-white/25" />
      </div>
      <div className="relative z-10 flex items-center justify-between px-4 pt-2 pb-0 min-h-[44px]">
        {canGoBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.18] bg-white/[0.08] backdrop-blur-xl px-3 py-1.5 text-xs font-semibold text-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] hover:bg-white/[0.14] active:scale-95 transition cursor-pointer touch-manipulation select-none"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white">
              <ChevronLeft size={13} strokeWidth={2.5} />
            </span>
            <span className="max-w-[120px] truncate">{backLabel}</span>
          </button>
        ) : <div />}
        <button
          onClick={canGoBack ? onBack : onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.18] bg-white/[0.08] backdrop-blur-xl text-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] hover:bg-white/[0.14] hover:text-white active:scale-90 transition cursor-pointer touch-manipulation"
        >
          <X size={17} strokeWidth={2.2} />
        </button>
      </div>
      <div className="px-5 pt-3 pb-2">
        <h2 className="text-lg font-bold tracking-tight text-white">{dramaTitle}</h2>
        <p className="text-xs text-white/40 mt-0.5">{photos.length} Stills & Posters</p>
      </div>
      <div
        className="flex-1 overflow-y-auto px-4 pb-12 scrollbar-hide overscroll-y-contain will-change-scroll"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
      >
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {photos.map((img, i) => (
            <button
              key={i}
              onClick={() => setLightboxSrc(`https://image.tmdb.org/t/p/original${img.file_path}`, `https://image.tmdb.org/t/p/w780${img.file_path}`)}
              className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-[#161620] border border-white/[0.10] active:scale-95 transition-transform duration-150 cursor-pointer touch-manipulation"
            >
              <Image
                src={`https://image.tmdb.org/t/p/w780${img.file_path}`}
                alt="Still"
                fill
                loading="lazy"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Cast Grid Page ───────────────────────────────────────────────────────────

function CastGridPage({
  cast, directors, dramaTitle, backLabel, canGoBack, onBack, onClose, onPersonClick
}: {
  cast: TmdbCastMember[]; directors: TmdbCrewMember[]; dramaTitle: string
  backLabel: string; canGoBack: boolean; onBack: () => void; onClose: () => void
  onPersonClick: (id: number, name: string) => void
}) {
  return (
    <div
      className="relative flex h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[36px] border-t border-white/[0.22] bg-[#0c0c12]/95 backdrop-blur-2xl shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.9)] will-change-transform transform-gpu"
      onClick={e => e.stopPropagation()}
    >
      <div className="relative z-10 flex justify-center pt-3 pb-0">
        <div className="h-1.5 w-12 rounded-full bg-white/25" />
      </div>
      <div className="relative z-10 flex items-center justify-between px-4 pt-2 pb-0 min-h-[44px]">
        {canGoBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.18] bg-white/[0.08] backdrop-blur-xl px-3 py-1.5 text-xs font-semibold text-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] hover:bg-white/[0.14] active:scale-95 transition cursor-pointer touch-manipulation select-none"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white">
              <ChevronLeft size={13} strokeWidth={2.5} />
            </span>
            <span className="max-w-[120px] truncate">{backLabel}</span>
          </button>
        ) : <div />}
        <button
          onClick={canGoBack ? onBack : onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.18] bg-white/[0.08] backdrop-blur-xl text-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] hover:bg-white/[0.14] hover:text-white active:scale-90 transition cursor-pointer touch-manipulation"
        >
          <X size={17} strokeWidth={2.2} />
        </button>
      </div>
      <div className="px-5 pt-3 pb-2">
        <h2 className="text-lg font-bold tracking-tight text-white">{dramaTitle}</h2>
        <p className="text-xs text-white/40 mt-0.5">{cast.length} Cast Members{directors.length > 0 ? ` · ${directors.length} Director${directors.length > 1 ? 's' : ''}` : ''}</p>
      </div>
      <div
        className="flex-1 overflow-y-auto px-4 pb-12 scrollbar-hide overscroll-y-contain will-change-scroll"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
      >
        {directors.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/35 mb-3">Direction</h3>
            <div className="flex flex-wrap gap-2.5">
              {directors.map(d => (
                <button
                  key={d.id}
                  onClick={() => onPersonClick(d.id, d.name)}
                  className="flex items-center gap-2.5 rounded-full bg-[#181822] border border-white/[0.12] px-4 py-2 active:scale-95 transition-transform duration-150 cursor-pointer touch-manipulation"
                >
                  {d.profile_path ? (
                    <div className="relative h-6 w-6 overflow-hidden rounded-full border border-white/20">
                      <Image src={`https://image.tmdb.org/t/p/w185${d.profile_path}`} alt={d.name} fill loading="lazy" className="object-cover" />
                    </div>
                  ) : <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50">?</div>}
                  <span className="text-xs font-semibold text-white/90">{d.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/35 mb-3">Cast</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {cast.map(c => (
            <button
              key={`${c.id}-${c.order}`}
              onClick={() => onPersonClick(c.id, c.name)}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform duration-150 cursor-pointer touch-manipulation select-none text-center"
            >
              <div className="relative h-24 w-full overflow-hidden rounded-[18px] border border-white/[0.12] bg-[#161620]">
                {c.profile_path ? (
                  <Image src={`https://image.tmdb.org/t/p/w185${c.profile_path}`} alt={c.name} fill loading="lazy" className="object-cover" />
                ) : <div className="flex h-full w-full items-center justify-center text-white/20 text-xs">?</div>}
              </div>
              <div className="w-full px-0.5">
                <div className="text-[11px] font-semibold text-white/90 truncate leading-tight">{c.name}</div>
                {c.character && <div className="text-[10px] text-white/40 truncate leading-tight mt-0.5">{c.character}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
