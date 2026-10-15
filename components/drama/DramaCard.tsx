'use client'

import { UserDrama, updateWatchedEpisodes, moveDrama } from '@/lib/supabase/archive'
import Image from 'next/image'
import { Star, Plus, Minus } from 'lucide-react'
import { REGION_NAMES } from './DramaDetailSheet'
import { tmdbCard } from '@/lib/image-utils'

interface DramaCardProps {
  drama: UserDrama
  actions?: React.ReactNode
  onOpen?: () => void
  staggerIndex?: number
}

export default function DramaCard({ drama, actions, onOpen, staggerIndex }: DramaCardProps) {
  const year = drama.release_year ? String(drama.release_year) : ''
  const regionBadge = drama.country ? REGION_NAMES[drama.country.toUpperCase()]?.badge || drama.country : null

  let episodesText = ''
  if (drama.total_episodes && drama.total_episodes > 1) {
    episodesText = `${drama.total_episodes} eps`
  } else if (drama.airing_status === 'upcoming') {
    episodesText = 'Upcoming'
  } else if (drama.airing_status === 'ongoing') {
    episodesText = 'Ongoing'
  }

  const subline = [regionBadge, year, episodesText].filter(Boolean).join(' • ')
  const posterSrc = tmdbCard(drama.poster_url)

  // Episode tracking for watching dramas
  const watchedEp = Number(drama.watched_episodes ?? drama.next_episode_number) || 0
  const totalEp = Number(drama.total_episodes) || 0
  const progressPct = totalEp > 0 ? Math.min(100, Math.round((watchedEp / totalEp) * 100)) : 0

  async function handleStep(delta: number, e: React.MouseEvent) {
    e.stopPropagation()
    const nextVal = Math.max(0, watchedEp + delta)
    await updateWatchedEpisodes(drama.drama_id, nextVal)
    if (totalEp > 0 && nextVal >= totalEp && drama.status === 'watching') {
      await moveDrama(drama.drama_id, 'finished')
    }
  }

  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpen()
        }
      }}
      style={
        staggerIndex !== undefined
          ? { animationDelay: `${Math.min(staggerIndex * 35, 350)}ms` }
          : undefined
      }
      className={`group relative aspect-[2/3] w-full overflow-hidden rounded-[26px] border border-white/[0.22] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.35)] transition-all duration-200 text-left touch-manipulation select-none active:scale-[0.98] transform-gpu ${
        staggerIndex !== undefined ? 'ios-stagger-card' : ''
      } ${onOpen ? 'cursor-pointer' : ''}`}
    >
      {/* 100% Full-Bleed Poster Image */}
      {posterSrc ? (
        <Image
          src={posterSrc}
          alt={drama.title}
          fill
          sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 22vw"
          loading="lazy"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-black/70 text-white/25 text-xs font-medium">
          No Poster
        </div>
      )}

      {/* Top Floating Glass Badges */}
      <div className="absolute inset-x-2.5 top-2.5 z-10 flex items-center justify-between gap-1 pointer-events-none">
        {regionBadge ? (
          <span className="rounded-full bg-black/45 backdrop-blur-xl border border-white/25 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">
            {regionBadge}
          </span>
        ) : <span />}

        {drama.rating > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-xl border border-amber-400/35 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-300 shadow-md">
            <Star size={10} className="fill-amber-300 text-amber-300" />
            {drama.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Floating Gaussian-Blurred Frosted Glass Dock */}
      <div className="absolute inset-x-2.5 bottom-2.5 z-10 rounded-[20px] bg-black/35 backdrop-blur-2xl border border-white/25 p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_8px_24px_rgba(0,0,0,0.5)] flex flex-col gap-1.5">
        <div className="flex flex-col min-w-0">
          <h3 className="text-[13px] font-bold tracking-tight text-white line-clamp-1 leading-tight group-hover:text-white/90">
            {drama.title}
          </h3>
          {subline && (
            <p className="text-[10px] font-medium text-white/60 truncate mt-0.5">
              {subline}
            </p>
          )}
        </div>

        {/* Watching Episode Stepper Capsule on Card */}
        {drama.status === 'watching' && (
          <div
            className="flex items-center justify-between rounded-full bg-white/[0.14] border border-white/25 py-1 px-2.5 backdrop-blur-xl shadow-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] font-bold tracking-wide text-white/90">
              EP {watchedEp}{totalEp > 0 ? ` / ${totalEp}` : ''}
              {totalEp > 0 && <span className="text-white/50 font-normal ml-1">({progressPct}%)</span>}
            </span>

            {/* Steppers */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Previous Episode"
                onClick={(e) => handleStep(-1, e)}
                disabled={watchedEp <= 0}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.15] hover:bg-white/[0.30] active:scale-90 text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <Minus size={10} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                title="Next Episode (+1)"
                onClick={(e) => handleStep(1, e)}
                className="flex h-5 items-center gap-0.5 px-2 rounded-full bg-white/[0.28] hover:bg-white/[0.45] active:scale-90 text-white font-bold text-[10px] shadow-sm transition cursor-pointer"
              >
                <Plus size={10} strokeWidth={3} />
                <span>1</span>
              </button>
            </div>
          </div>
        )}

        {/* 1-Tap Action Buttons Shelf */}
        {actions && (
          <div
            className="pt-1.5 border-t border-white/[0.14]"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
