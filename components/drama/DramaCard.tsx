'use client'

import { UserDrama } from '@/lib/supabase/archive'
import Image from 'next/image'
import { Star, CheckCircle, Play, Bookmark } from 'lucide-react'
import { motion } from 'framer-motion'
import { REGION_NAMES } from './DramaDetailSheet'

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

  const subline = [regionBadge, year, episodesText].filter(Boolean).join(' • ')

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', damping: 20, stiffness: 350 }}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpen()
        }
      }}
      className={`group relative flex flex-col overflow-hidden rounded-[24px] border border-white/[0.14] bg-white/[0.05] backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_14px_36px_-6px_rgba(0,0,0,0.7)] transition-all duration-300 text-left ${
        onOpen ? 'cursor-pointer' : ''
      }`}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-black/60">
        {drama.poster_url ? (
          <Image
            src={drama.poster_url}
            alt={drama.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
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
            <span className="rounded-full bg-black/60 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md backdrop-blur-md">
              {regionBadge}
            </span>
          ) : <span />}

          {drama.rating > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-black/60 border border-amber-400/30 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 shadow-md backdrop-blur-md">
              <Star size={10} className="fill-amber-300 text-amber-300" />
              {drama.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Gradient shadow towards text */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      </div>

      {/* Card Info & Actions Shelf */}
      <div className="flex flex-1 flex-col justify-between p-3.5 bg-black/40 backdrop-blur-md">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
            {drama.title}
          </h3>
          {subline && (
            <p className="text-[11px] font-medium text-white/45 truncate mt-0.5">
              {subline}
            </p>
          )}
        </div>

        {/* 1-Tap Action Buttons */}
        {actions && (
          <div
            className="mt-3 flex items-center gap-1.5 pt-2 border-t border-white/[0.08]"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  )
}
