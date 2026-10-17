'use client'

import { getUserDramas, moveDrama, removeDrama, onArchiveSync, getSavedDramasSync, UserDrama } from '@/lib/supabase/archive'
import { Play, CheckCircle, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import DramaCard from '@/components/drama/DramaCard'

interface WatchingTabProps {
  onOpenDrama: (id: number, preview?: UserDrama) => void
  onOpenPerson: (id: number, name?: string) => void
  activeCount?: number
}

export default function WatchingTab({ onOpenDrama, activeCount }: WatchingTabProps) {
  const [dramas, setDramas] = useState<UserDrama[]>(() =>
    getSavedDramasSync().filter((d) => d.status === 'watching')
  )
  const [loading, setLoading] = useState(dramas.length === 0)

  async function load() {
    const data = await getUserDramas('watching')
    setDramas(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const unsubscribe = onArchiveSync((allDramas) => {
      setDramas(allDramas.filter((d) => d.status === 'watching'))
    })
    return () => unsubscribe()
  }, [])

  function handleOpenDrama(drama: UserDrama) {
    ;(document.activeElement as HTMLElement)?.blur()
    onOpenDrama(drama.tmdb_id, drama)
  }

  async function handleMarkFinished(dramaId: string) {
    await moveDrama(dramaId, 'finished')
  }

  async function handleRemove(dramaId: string) {
    await removeDrama(dramaId)
  }

  if (loading && dramas.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-purple-500" />
      </div>
    )
  }

  if (dramas.length === 0) {
    return (
      <div className="relative flex min-h-[calc(100vh-140px)] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.14] bg-white/[0.06] shadow-xl backdrop-blur-md mb-4">
          <Play size={32} className="text-purple-400/70 ml-1" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">No Dramas in Progress</h3>
        <p className="mt-1 text-sm text-white/45 max-w-xs">
          Tap the Play button on any drama to track what you are actively watching.
        </p>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 pb-24 flex flex-col gap-6">
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-400/30 bg-purple-500/15 text-purple-400 shadow-lg shadow-purple-500/20 backdrop-blur-md">
            <Play size={18} className="fill-purple-400 ml-0.5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Currently Watching</h2>
            <p className="text-xs text-white/40">Active series & upcoming episodes</p>
          </div>
        </div>
      </div>

      <div
        key={`watching-grid-${activeCount ?? 0}`}
        style={{ animation: 'smoothGridReveal 0.85s cubic-bezier(0.33, 1, 0.68, 1) both' }}
        className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5"
      >
        {dramas.map((drama) => (
          <DramaCard
            key={drama.drama_id}
            drama={drama}
            onOpen={() => handleOpenDrama(drama)}
            actions={
              <div className="flex items-center gap-1.5 w-full">
                <button
                  title="Mark as Finished"
                  onClick={() => handleMarkFinished(drama.drama_id)}
                  className="flex-1 h-8 rounded-full bg-white/[0.16] hover:bg-white/[0.26] border border-white/[0.22] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer touch-manipulation select-none"
                >
                  <CheckCircle size={13} />
                  <span>Finish</span>
                </button>
                <button
                  title="Remove from Watching"
                  onClick={() => handleRemove(drama.drama_id)}
                  className="w-8 h-8 rounded-full bg-white/[0.12] hover:bg-white/[0.24] border border-white/[0.2] text-white/90 hover:text-white flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer touch-manipulation select-none"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            }
          />
        ))}
      </div>
    </div>
  )
}
