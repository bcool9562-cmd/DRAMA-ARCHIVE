'use client'

import { UserDrama } from '@/lib/supabase/archive'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { REGION_NAMES } from './DramaDetailSheet'
import { tmdbCard } from '@/lib/image-utils'
import { haptic } from '@/lib/haptics'

interface DramaCardProps {
  drama: UserDrama
  actions?: React.ReactNode
  onOpen?: () => void
}

export default function DramaCard({ drama, actions, onOpen }: DramaCardProps) {
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window === 'undefined' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = Math.max(-4, Math.min(4, ((y - centerY) / centerY) * -4))
    const rotateY = Math.max(-4, Math.min(4, ((x - centerX) / centerX) * 4))

    e.currentTarget.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1)`
    e.currentTarget.style.setProperty('--glare-x', `${x}px`)
    e.currentTarget.style.setProperty('--glare-y', `${y}px`)
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = ''
  }

  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={() => {
        if (onOpen) {
          haptic.light()
          onOpen()
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          haptic.light()
          onOpen()
        }
      }}
      className={`group relative aspect-[2/3] w-full rounded-[24px] overflow-hidden border border-white/[0.18] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:-translate-y-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] text-left touch-manipulation select-none transform-gpu ${onOpen ? 'cursor-pointer' : ''}`}
    >
      {/* Soft Diagonal Glass Glare Overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
        style={{
          background: 'radial-gradient(280px circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.16) 0%, transparent 60%), linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 50%)',
        }}
      />
      {/* 1. Full-Bleed 100% Poster Image */}
      {posterSrc ? (
        <Image
          src={posterSrc}
          alt={drama.title}
          fill
          sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 22vw"
          loading="lazy"
          decoding="async"
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
          <span className="rounded-full bg-[#0a0a10]/90 md:bg-black/45 max-md:backdrop-blur-none md:backdrop-blur-xl border border-white/25 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">
            {regionBadge}
          </span>
        ) : <span />}

        {drama.rating > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-[#0a0a10]/90 md:bg-black/45 max-md:backdrop-blur-none md:backdrop-blur-xl border border-amber-400/35 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-300 shadow-md">
            <Star size={10} className="fill-amber-300 text-amber-300" />
            {drama.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* 2. High-Performance Multi-Layered Frosted Glass Overlay Box */}
      <div className="absolute inset-x-2.5 bottom-2.5 z-10 rounded-[18px] bg-gradient-to-t from-[#08080d]/95 via-[#12121c]/88 to-[#1c1c2b]/80 border border-white/[0.14] p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.16),0_8px_20px_rgba(0,0,0,0.5)] flex flex-col gap-2">
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
