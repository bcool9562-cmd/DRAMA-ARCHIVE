'use client'

import { UserDrama, updateWatchedEpisodes, moveDrama } from '@/lib/supabase/archive'
import Image from 'next/image'
import { Star, Plus, Minus, Check } from 'lucide-react'
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
      className={`group relative flex flex-col overflow-hidden rounded-[24px] border border-white/[0.16] bg-white/[0.08] backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.28),0_12px_32px_rgba(0,0,0,0.55)] transition-all duration-200 text-left touch-manipulation select-none active:scale-[0.98] transform-gpu ${
        staggerIndex !== undefined ? 'ios-stagger-card' : ''
      } ${onOpen ? 'cursor-pointer' : ''}`}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-black/60">
        {posterSrc ? (
          <Image
            src={posterSrc}
            alt={drama.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
            loading="lazy"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/25 text-xs font-medium">
            No Image
          </div>
        )}

        {/* Top Badges Ribbon */}
        <div className="absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-1 pointer-events-none">
          {regionBadge ? (
            <span className="rounded-full bg-black/70 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md backdrop-blur-md">
              {regionBadge}
            </span>
          ) : <span />}

          {drama.rating > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-black/70 border border-amber-400/30 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 shadow-md backdrop-blur-md">
              <Star size={10} className="fill-amber-300 text-amber-300" />
              {drama.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Liquid Progress Bar on Poster bottom (Watching dramas) */}
        {drama.status === 'watching' && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/70">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-sky-400 shadow-[0_0_8px_rgba(217,70,239,0.8)] transition-all duration-300"
              style={{ width: `${totalEp > 0 ? progressPct : 100}%` }}
            />
          </div>
        )}

        {/* Gradient shadow towards text */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Card Info & Actions Shelf */}
      <div className="flex flex-1 flex-col justify-between p-3.5 bg-black/60 backdrop-blur-xl">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
            {drama.title}
          </h3>
          {subline && (
            <p className="text-[11px] font-medium text-white/45 truncate mt-0.5">
              {subline}
            </p>
          )}

          {/* Watching Episode Stepper Capsule on Card */}
          {drama.status === 'watching' && (
            <div
              className="mt-2 flex items-center justify-between rounded-full bg-white/[0.08] border border-white/[0.14] p-1 px-2.5 backdrop-blur-md shadow-inner"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-wide text-purple-300">
                  EP {watchedEp}{totalEp > 0 ? ` / ${totalEp}` : ''}
                </span>
                {totalEp > 0 && (
                  <span className="text-[9px] font-medium text-white/40">
                    ({progressPct}%)
                  </span>
                )}
              </div>

              {/* Steppers */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Previous Episode"
                  onClick={(e) => handleStep(-1, e)}
                  disabled={watchedEp <= 0}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                >
                  <Minus size={10} />
                </button>
                <button
                  type="button"
                  title="Next Episode (+1)"
                  onClick={(e) => handleStep(1, e)}
                  className="flex h-5 items-center gap-0.5 px-1.5 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 active:scale-95 text-white font-bold text-[10px] shadow-sm transition cursor-pointer"
                >
                  <Plus size={10} strokeWidth={3} />
                  <span>1</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 1-Tap Action Buttons */}
        {actions && (
          <div
            className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-white/[0.08]"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
