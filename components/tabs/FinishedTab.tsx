'use client'

import { getUserDramas, moveDrama, removeDrama, UserDrama } from '@/lib/supabase/archive'
import { CheckCircle, Play, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import DramaCard from '@/components/drama/DramaCard'
import DramaDetailSheet from '@/components/drama/DramaDetailSheet'
import PersonProfileSheet from '@/components/person/PersonProfileSheet'

export default function FinishedTab() {
  const [dramas, setDramas] = useState<UserDrama[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTmdbId, setSelectedTmdbId] = useState<number | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)
  const [, setSelectedPersonName] = useState('')

  async function load() {
    setLoading(true)
    const data = await getUserDramas('finished')
    setDramas(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleRewatch(dramaId: string) {
    await moveDrama(dramaId, 'watching')
    load()
  }

  async function handleRemove(dramaId: string) {
    await removeDrama(dramaId)
    load()
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
      </div>
    )
  }

  const featuredPoster = dramas.find(d => d.poster_url)?.poster_url

  if (dramas.length === 0) {
    return (
      <div className="relative flex min-h-[75vh] flex-col items-center justify-center px-6 pt-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.14] bg-white/[0.06] shadow-xl backdrop-blur-2xl mb-4">
          <CheckCircle size={32} className="text-emerald-400/70" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">No Finished Dramas Yet</h3>
        <p className="mt-1 text-sm text-white/45 max-w-xs">
          When you complete a drama, mark it finished to keep a permanent archive of your journey.
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen px-4 pb-36 pt-20 max-w-7xl mx-auto">
      {/* Ambient Poster Glow Layer */}
      {featuredPoster && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div
            className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[140%] h-[75vh] rounded-full blur-[130px] saturate-200 opacity-25 scale-125"
            style={{
              backgroundImage: `url(${featuredPoster})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black" />
        </div>
      )}

      {/* Header Bar */}
      <div className="relative z-10 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-400 shadow-lg shadow-emerald-500/20 backdrop-blur-xl">
            <CheckCircle size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Finished</h2>
            <p className="text-xs text-white/40">Completed drama archive</p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1 text-xs font-semibold text-white/70 backdrop-blur-xl">
          {dramas.length} {dramas.length === 1 ? 'drama' : 'dramas'}
        </span>
      </div>

      {/* Responsive iOS Poster Grid */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
        {dramas.map((drama) => (
          <DramaCard
            key={drama.drama_id}
            drama={drama}
            onOpen={() => setSelectedTmdbId(drama.tmdb_id)}
            actions={
              <div className="flex items-center gap-1.5 w-full">
                <button
                  title="Re-watch"
                  onClick={() => handleRewatch(drama.drama_id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-full border border-purple-500/30 bg-purple-500/15 text-purple-200 hover:bg-purple-500/30 active:scale-95 transition text-[11px] font-semibold"
                >
                  <Play size={11} className="fill-purple-300 text-purple-300" />
                  <span>Re-watch</span>
                </button>
                <button
                  title="Remove from Archive"
                  onClick={() => handleRemove(drama.drama_id)}
                  className="flex items-center justify-center h-7 w-7 rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/30 active:scale-90 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            }
          />
        ))}
      </div>

      {/* Drama Detail Sheet */}
      {selectedTmdbId && (
        <DramaDetailSheet
          tmdbId={selectedTmdbId}
          onClose={() => { setSelectedTmdbId(null); load() }}
          onPersonClick={(id, name) => { setSelectedPersonId(id); setSelectedPersonName(name) }}
        />
      )}

      {/* Person Profile Sheet */}
      {selectedPersonId && (
        <PersonProfileSheet
          personId={selectedPersonId}
          onClose={() => setSelectedPersonId(null)}
          onDramaClick={(id) => { setSelectedPersonId(null); setSelectedTmdbId(id) }}
        />
      )}
    </div>
  )
}
