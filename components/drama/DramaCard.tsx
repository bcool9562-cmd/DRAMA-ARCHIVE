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

  // Episode tracking calculation with smart visual denominator (Fix for "The Early Spring" & missing total_episodes)
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
      className={`group relative flex flex-col overflow-hidden rounded-[24px] border border-white/[0.14] bg-[#111118] shadow-lg transition-all duration-200 text-left touch-manipulation select-none active:scale-[0.98] transform-gpu ${
        staggerIndex !== undefined ? 'ios-stagger-card' : ''
      } ${onOpen ? 'cursor-pointer' : ''}`}
    >
      {/* 1. Poster at top */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-black/60">
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
            <span className="rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">
              {regionBadge}
            </span>
          ) : <span />}

          {drama.rating > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-300 shadow-md">
              <Star size={10} className="fill-amber-300 text-amber-300" />
              {drama.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* 2. Info / Action Section sits FLUSH below the poster */}
      <div className="flex flex-1 flex-col justify-between bg-[#111118] p-3.5 border-t border-white/[0.06]">
        <div>
          <h3 className="text-[15px] font-bold text-white truncate leading-tight group-hover:text-purple-300 transition-colors">
            {drama.title}
          </h3>
          {subline && (
            <p className="text-xs text-white/50 truncate mt-1">
              {subline}
            </p>
          )}

          {/* On Watching cards: Always visible Episode Tracker with steppers & progress bar */}
          {drama.status === 'watching' && (
            <div
              className="mt-2.5 flex flex-col gap-1.5 rounded-[14px] bg-white/[0.06] border border-white/[0.10] p-2 backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-tight text-white/90">
                  EP {watchedEp}{totalEp > 1 ? ` / ${totalEp}` : ''}
                  {totalEp > 1 && (
                    <span className="text-purple-300 font-semibold text-[10px] ml-1.5">
                      ({progressPct}%)
                    </span>
                  )}
                </span>

                {/* Steppers */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Previous Episode"
                    onClick={(e) => handleStep(-1, e)}
                    disabled={watchedEp <= 0}
                    className="w-6 h-6 rounded-full bg-white/[0.12] hover:bg-white/[0.22] text-white flex items-center justify-center border border-white/[0.12] active:scale-90 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    <Minus size={11} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    title="Next Episode (+1)"
                    onClick={(e) => handleStep(1, e)}
                    className="h-6 px-2.5 rounded-full bg-purple-500 hover:bg-purple-400 text-white font-bold text-[10px] flex items-center gap-0.5 shadow-[0_0_10px_rgba(168,85,247,0.5)] active:scale-90 transition cursor-pointer"
                  >
                    <Plus size={10} strokeWidth={3} />
                    <span>1</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar (Always visible on watching) */}
              <div className="relative h-1.5 w-full rounded-full bg-black/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-400 to-sky-400 shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 1-Tap Action Buttons Shelf */}
        {actions && (
          <div
            className="mt-3 pt-2.5 border-t border-white/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
