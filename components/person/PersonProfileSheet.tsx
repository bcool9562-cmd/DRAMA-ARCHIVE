'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, Star, Calendar } from 'lucide-react'
import type { TmdbPerson, TmdbPersonCredit } from '@/lib/tmdb'

interface PersonProfileSheetProps {
  personId: number
  onClose: () => void
  onDramaClick: (tmdbId: number) => void
}

export default function PersonProfileSheet({ personId, onClose, onDramaClick }: PersonProfileSheetProps) {
  const [person, setPerson] = useState<TmdbPerson | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFullBio, setShowFullBio] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/person/${personId}`)
      .then(r => r.json())
      .then(p => { setPerson(p); setLoading(false) })
      .catch(() => setLoading(false))
  }, [personId])

  const allWorks = [
    ...(person?.combined_credits?.cast ?? []),
    ...(person?.combined_credits?.crew ?? []),
  ]
  // Deduplicate by id
  const dedupedWorks = allWorks.filter((w, i, a) => a.findIndex(x => x.id === w.id) === i)

  const bioPreview = person?.biography?.slice(0, 300)
  const bioFull = person?.biography ?? ''

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border-t border-white/[0.12] bg-[#0a0a0f]"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <button
          onClick={onClose}
          className="absolute right-4 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-white/60 hover:text-white"
        >
          <X size={18} />
        </button>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
          </div>
        ) : !person ? (
          <div className="flex flex-1 items-center justify-center text-white/40">Failed to load.</div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 pb-10">
            {/* Profile header */}
            <div className="flex gap-4 mt-2 mb-5">
              <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-white/[0.12] shadow-xl">
                {person.profile_path
                  ? <Image src={person.profile_path} alt={person.name} fill className="object-cover" />
                  : <div className="h-full bg-white/[0.05] flex items-center justify-center text-white/20 text-xs">?</div>
                }
              </div>
              <div className="flex flex-col justify-center">
                <h2 className="text-xl font-bold text-white">{person.name}</h2>
                <p className="text-sm text-white/40">{person.known_for_department}</p>
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
              <div className="mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2">Biography</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {showFullBio ? bioFull : (bioPreview && bioFull.length > 300 ? `${bioPreview}…` : bioFull)}
                </p>
                {bioFull.length > 300 && (
                  <button
                    onClick={() => setShowFullBio(v => !v)}
                    className="mt-1 text-xs text-purple-400 hover:text-purple-300"
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
                <div className="grid grid-cols-3 gap-2">
                  {dedupedWorks.slice(0, 30).map(work => (
                    <WorkCard key={work.id} work={work} onClick={() => onDramaClick(work.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function WorkCard({ work, onClick }: { work: TmdbPersonCredit; onClick: () => void }) {
  const title = work.name ?? work.title ?? ''
  const year = (work.first_air_date ?? work.release_date ?? '').slice(0, 4)
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-1 rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.04] hover:border-white/20 transition group"
    >
      <div className="relative aspect-[2/3] w-full bg-white/[0.05]">
        {work.poster_path
          ? <Image src={work.poster_path} alt={title} fill className="object-cover" />
          : <div className="h-full w-full flex items-center justify-center text-white/15 text-[10px]">No img</div>
        }
      </div>
      <div className="p-1.5">
        <div className="text-[10px] font-medium text-white/70 leading-tight line-clamp-2">{title}</div>
        {year && <div className="text-[9px] text-white/30 mt-0.5">{year}</div>}
        {work.vote_average > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <Star size={9} className="text-yellow-400 fill-yellow-400" />
            <span className="text-[9px] text-white/40">{work.vote_average.toFixed(1)}</span>
          </div>
        )}
      </div>
    </button>
  )
}
