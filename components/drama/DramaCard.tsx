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

// Photo 3 Signature Laser-Flare Progress Bar component
export function CornfieldLaserProgressBar({ progressPct }: { progressPct: number }) {
  const safePct = Math.min(96, Math.max(5, progressPct))
  return (
    <div className="relative h-[4px] w-full rounded-full bg-white/[0.14] overflow-visible my-1">
      {/* Filled beam */}
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#38bdf8] via-[#bae6fd] to-white shadow-[0_0_12px_rgba(56,189,248,0.85)] relative transition-all duration-300"
        style={{ width: `${safePct}%` }}
      >
        {/* Comet Lens-Flare Tip (Photo 3 signature effect) */}
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-3.5 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,1)_0%,rgba(125,211,252,0.85)_40%,rgba(56,189,248,0)_80%)] blur-[2px] pointer-events-none" />
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-1 rounded-full bg-white shadow-[0_0_10px_2px_#fff] pointer-events-none" />
      </div>
    </div>
  )
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

  // Episode tracking calculation with smart visual denominator (Fix for "The Early Spring" & missing total_episodes)
  const watchedEp = Number(drama.watched_episodes ?? drama.next_episode_number) || 0
  const totalEp = Number(drama.total_episodes) || 0
  const effectiveTotal = totalEp > 1 ? totalEp : Math.max(watchedEp + 5, 16)
  const progressPct = Math.min(94, Math.max(6, Math.round(((watchedEp || 1) / effectiveTotal) * 100)))

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

      {/* Photo 3 Deep Obsidian Glass Dock with Saturated Bottom Horizon Glow */}
      <div className="absolute inset-x-2.5 bottom-2.5 z-10 rounded-[22px] bg-[#0a0a12]/85 backdrop-blur-2xl border border-white/[0.16] p-3.5 relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_12px_32px_rgba(0,0,0,0.6)] flex flex-col gap-2">
        {/* Photo 3 Saturated Bottom-Edge Horizon Glow */}
        {drama.status === 'watching' && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_110%,rgba(168,85,247,0.55)_0%,transparent_70%)]" />
        )}
        {drama.status === 'watchlist' && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_110%,rgba(56,189,248,0.5)_0%,transparent_70%)]" />
        )}
        {drama.status === 'finished' && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_110%,rgba(16,185,129,0.5)_0%,transparent_70%)]" />
        )}

        <div className="relative z-10 flex flex-col min-w-0">
          <h3 className="text-[13px] font-bold tracking-tight text-white line-clamp-1 leading-tight group-hover:text-white/90">
            {drama.title}
          </h3>
          {subline && (
            <p className="text-[10px] font-medium text-white/60 truncate mt-0.5">
              {subline}
            </p>
          )}
        </div>

        {/* Watching Stepper + Photo 3 "Cornfield Chase" Laser-Flare Progress Bar (ALWAYS RENDERS ON WATCHING) */}
        {drama.status === 'watching' && (
          <div
            className="relative z-10 flex flex-col gap-1.5 rounded-[16px] bg-white/[0.08] border border-white/[0.14] p-2.5 backdrop-blur-xl shadow-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-tight text-white">
                EP {watchedEp}{totalEp > 1 ? ` / ${totalEp}` : ''}
                {totalEp > 1 && (
                  <span className="text-[#38bdf8] font-bold text-[10px] ml-1.5">
                    ({progressPct}%)
                  </span>
                )}
              </span>

              {/* Action Orbs: Frosted Minus Orb + Electric Sky-Blue Plus Orb */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Previous Episode"
                  onClick={(e) => handleStep(-1, e)}
                  disabled={watchedEp <= 0}
                  className="w-7 h-7 rounded-full bg-white/[0.14] hover:bg-white/[0.22] text-white flex items-center justify-center border border-white/[0.15] active:scale-90 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <Minus size={11} strokeWidth={2.8} />
                </button>
                <button
                  type="button"
                  title="Next Episode (+1)"
                  onClick={(e) => handleStep(1, e)}
                  className="h-7 px-3 rounded-full bg-[#38bdf8] text-[#04111d] font-bold text-[11px] flex items-center gap-1 shadow-[0_0_16px_rgba(56,189,248,0.55)] active:scale-90 transition cursor-pointer"
                >
                  <Plus size={11} strokeWidth={3} />
                  <span>1</span>
                </button>
              </div>
            </div>

            {/* Photo 3 "Cornfield Chase" Laser-Flare Progress Bar */}
            <CornfieldLaserProgressBar progressPct={progressPct} />
          </div>
        )}

        {/* 1-Tap Action Buttons Shelf */}
        {actions && (
          <div
            className="relative z-10 pt-2 border-t border-white/[0.12]"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
