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

  const subline = [regionBadge, year, episodesText].filter(Boolean).join(' · ')
  const posterSrc = tmdbCard(drama.poster_url)

  // Episode tracking calculation with smart visual denominator
  const watchedEp = Number(drama.watched_episodes ?? drama.next_episode_number) || 0
  const totalEp = Number(drama.total_episodes) || 0
  const effectiveTotal = totalEp > 1 ? totalEp : Math.max(watchedEp + 5, 16)
  const progressPct = Math.min(100, Math.max(6, Math.round(((watchedEp || 1) / effectiveTotal) * 100)))

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
      className={`group relative aspect-[2/3] w-full rounded-[24px] overflow-hidden border border-white/[0.18] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:-translate-y-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] text-left touch-manipulation select-none transform-gpu ${
        staggerIndex !== undefined ? 'ios-stagger-card' : ''
      } ${onOpen ? 'cursor-pointer' : ''}`}
    >
      {/* 1. Full-Bleed 100% Poster Image */}
      {posterSrc ? (
        <Image
          src={posterSrc}
          alt={drama.title}
          fill
          sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 22vw"
          loading="lazy"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
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

      {/* 2. Photo 1 Colorless Gaussian-Blurred Glass Overlay Box */}
      <div className="absolute inset-x-2.5 bottom-2.5 z-10 rounded-[18px] bg-black/35 backdrop-blur-xl border border-white/[0.18] p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_24px_rgba(0,0,0,0.45)] flex flex-col gap-2">
        <div className="flex flex-col min-w-0">
          <h3 className="text-[13px] sm:text-[14px] font-bold tracking-tight text-white truncate leading-tight group-hover:text-white/90">
            {drama.title}
          </h3>
          {subline && (
            <p className="text-[11px] font-medium text-white/60 truncate mt-0.5">
              {subline}
            </p>
          )}
        </div>

        {/* On Watching cards: Colorless Frosted Glass Steppers + Progress Bar */}
        {drama.status === 'watching' && (
          <div
            className="flex flex-col gap-1.5 rounded-[14px] bg-white/[0.08] border border-white/[0.14] p-2 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-tight text-white/90">
                EP {watchedEp}{totalEp > 1 ? ` / ${totalEp}` : ''}
                {totalEp > 1 && (
                  <span className="text-white/60 font-medium text-[10px] ml-1">
                    ({progressPct}%)
                  </span>
                )}
              </span>

              {/* Colorless Frosted Glass Steppers */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Previous Episode"
                  onClick={(e) => handleStep(-1, e)}
                  disabled={watchedEp <= 0}
                  className="w-7 h-7 rounded-full bg-white/[0.12] hover:bg-white/[0.24] border border-white/[0.2] text-white/90 hover:text-white flex items-center justify-center transition-all duration-200 active:scale-90 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <Minus size={11} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  title="Next Episode (+1)"
                  onClick={(e) => handleStep(1, e)}
                  className="h-7 px-2.5 rounded-full bg-white/[0.16] hover:bg-white/[0.26] border border-white/[0.22] text-white text-[11px] font-semibold flex items-center gap-0.5 transition-all duration-200 active:scale-90 cursor-pointer shadow-sm"
                >
                  <Plus size={11} strokeWidth={2.5} />
                  <span>1</span>
                </button>
              </div>
            </div>

            {/* Clean Frosted Progress Bar */}
            <div className="relative h-1.5 w-full rounded-full bg-black/40 overflow-hidden border border-white/[0.10]">
              <div
                className="h-full rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.7)] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons shelf */}
        {actions && (
          <div
            className="pt-1.5 border-t border-white/[0.12]"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
