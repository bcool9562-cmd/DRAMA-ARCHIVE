'use client'

import { getUserDramas, moveDrama, removeDrama, onArchiveSync, getSavedDramasSync, UserDrama } from '@/lib/supabase/archive'
import { Play, CheckCircle, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import DramaCard from '@/components/drama/DramaCard'

interface WatchingTabProps {
  onOpenDrama: (id: number, preview?: UserDrama) => void
  onOpenPerson: (id: number, name?: string) => void
}

export default function WatchingTab({ onOpenDrama }: WatchingTabProps) {
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
      <div className="relative flex min-h-[75vh] flex-col items-center justify-center px-6 pt-16 text-center">
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
    <div className="relative min-h-screen px-4 pb-36 pt-20 max-w-7xl mx-auto animate-ios-spring">
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.18),_transparent_65%)]" />
      </div>

      <div className="relative z-10 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-400/30 bg-purple-500/15 text-purple-400 shadow-lg shadow-purple-500/20 backdrop-blur-md">
            <Play size={18} className="fill-purple-400 ml-0.5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Currently Watching</h2>
            <p className="text-xs text-white/40">Active series & upcoming episodes</p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1 text-xs font-semibold text-white/70 backdrop-blur-md">
          {dramas.length} {dramas.length === 1 ? 'drama' : 'dramas'}
        </span>
      </div>

      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
        {dramas.map((drama, index) => (
          <DramaCard
            key={drama.drama_id}
            drama={drama}
            staggerIndex={index}
            onOpen={() => handleOpenDrama(drama)}
            actions={
              <div className="flex items-center gap-1.5 w-full">
                <button
                  title="Mark as Finished"
                  onClick={() => handleMarkFinished(drama.drama_id)}
                  className="flex-1 h-9 rounded-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/35 text-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer touch-manipulation select-none"
                >
                  <CheckCircle size={14} />
                  <span>Finish</span>
                </button>
                <button
                  title="Remove from Watching"
                  onClick={() => handleRemove(drama.drama_id)}
                  className="h-9 w-9 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 flex items-center justify-center transition active:scale-90 cursor-pointer touch-manipulation select-none"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            }
          />
        ))}
      </div>
    </div>
  )
}
