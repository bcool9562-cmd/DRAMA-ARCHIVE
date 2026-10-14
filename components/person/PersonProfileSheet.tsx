'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { X, Calendar, Star, Loader2 } from 'lucide-react'
import type { TmdbPersonDetail, TmdbPersonCredit } from '@/lib/tmdb'
import { tmdbCard, tmdbThumb } from '@/lib/image-utils'

interface PersonProfileSheetProps {
  personId: number
  onClose: () => void
  onDramaClick: (tmdbId: number) => void
}

export default function PersonProfileSheet({
  personId,
  onClose,
  onDramaClick,
}: PersonProfileSheetProps) {
  const [person, setPerson] = useState<TmdbPersonDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFullBio, setShowFullBio] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/person/${personId}`)
      .then(r => r.json())
      .then(d => { setPerson(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [personId])

  // Deduplicate credits by ID, sort by vote count / date descending
  const dedupedWorks: TmdbPersonCredit[] = []
  if (person?.combined_credits?.cast) {
    const seen = new Set<number>()
    const sorted = [...person.combined_credits.cast].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
    for (const w of sorted) {
      if (!seen.has(w.id)) {
        seen.add(w.id)
        dedupedWorks.push(w)
      }
    }
  }

  const bioPreview = person?.biography ? person.biography.slice(0, 300) : ''
  const bioFull = person?.biography ?? ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative flex h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-white/[0.15] bg-[#0c0c10] shadow-2xl will-change-transform"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition cursor-pointer"
        >
          <X size={15} />
        </button>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 size={24} className="animate-spin text-purple-400" />
          </div>
        ) : person ? (
          <div className="flex-1 overflow-y-auto px-5 pb-8 pt-4 scrollbar-hide">
            {/* Header info */}
            <div className="flex gap-4 mb-5">
              <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-white/[0.05] shadow-lg">
                {person.profile_path ? (
                  <Image
                    src={tmdbThumb(person.profile_path)}
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
                  {showFullBio ? bioFull : (bioPreview && bioFull.length > 300 ? `${bioPreview}…` : bioFull)}
                </p>
                {bioFull.length > 300 && (
                  <button
                    onClick={() => setShowFullBio(v => !v)}
                    className="mt-1 text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                  >
                    {showFullBio ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            {/* Other Works */}
            {dedupedWorks.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Other Works</h3>
                <div className="grid grid-cols-3 gap-2.5">
                  {dedupedWorks.slice(0, 30).map(work => (
                    <WorkCard key={work.id} work={work} onClick={() => onDramaClick(work.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}

function WorkCard({ work, onClick }: { work: TmdbPersonCredit; onClick: () => void }) {
  const title = work.name ?? work.title ?? ''
  const year = (work.first_air_date ?? work.release_date ?? '').slice(0, 4)
  const posterSrc = tmdbCard(work.poster_path)

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-1 rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.04] hover:border-white/20 transition group text-left cursor-pointer"
    >
      <div className="relative aspect-[2/3] w-full bg-white/[0.05]">
        {posterSrc ? (
          <Image
            src={posterSrc}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 30vw, 120px"
            loading="lazy"
          />
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
