'use client'

import { getUserDramas, moveDrama, removeDrama, onArchiveSync, getSavedDramasSync, UserDrama } from '@/lib/supabase/archive'
import { CheckCircle, Play, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import DramaCard from '@/components/drama/DramaCard'

interface FinishedTabProps {
  onOpenDrama: (id: number, preview?: UserDrama) => void
  onOpenPerson: (id: number, name?: string) => void
}

export default function FinishedTab({ onOpenDrama }: FinishedTabProps) {
  const [dramas, setDramas] = useState<UserDrama[]>(() =>
    getSavedDramasSync().filter((d) => d.status === 'finished')
  )
  const [loading, setLoading] = useState(dramas.length === 0)

  async function load() {
    const data = await getUserDramas('finished')
    setDramas(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const unsubscribe = onArchiveSync((allDramas) => {
      setDramas(allDramas.filter((d) => d.status === 'finished'))
    })
    return () => unsubscribe()
  }, [])

  function handleOpenDrama(drama: UserDrama) {
    ;(document.activeElement as HTMLElement)?.blur()
    onOpenDrama(drama.tmdb_id, drama)
  }

  async function handleRewatch(dramaId: string) {
    await moveDrama(dramaId, 'watching')
  }

  async function handleRemove(dramaId: string) {
    await removeDrama(dramaId)
  }

  if (loading && dramas.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
      </div>
    )
  }

  if (dramas.length === 0) {
    return (
      <div className="relative flex min-h-[calc(100vh-140px)] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.14] bg-white/[0.06] shadow-xl backdrop-blur-md mb-4">
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
    <div className="relative min-h-[calc(100vh-140px)] h-auto px-4 pb-24 pt-6 sm:pt-8 max-w-7xl mx-auto flex flex-col justify-between animate-ios-spring">
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.18),_transparent_65%)]" />
      </div>

      <div className="relative z-10 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-400 shadow-lg shadow-emerald-500/20 backdrop-blur-md">
            <CheckCircle size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Finished</h2>
            <p className="text-xs text-white/40">Completed drama archive</p>
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
                  title="Re-watch"
                  onClick={() => handleRewatch(drama.drama_id)}
                  className="flex-1 h-8 rounded-full bg-white/[0.16] hover:bg-white/[0.26] border border-white/[0.22] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer touch-manipulation select-none"
                >
                  <Play size={11} className="fill-white" />
                  <span>Rewatch</span>
                </button>
                <button
                  title="Remove from Archive"
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
