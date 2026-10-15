'use client'

import { getUserDramas, moveDrama, removeDrama, onArchiveSync, getSavedDramasSync, UserDrama } from '@/lib/supabase/archive'
import { Bookmark, Play, CheckCircle, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import DramaCard from '@/components/drama/DramaCard'

interface WatchlistTabProps {
  onOpenDrama: (id: number, preview?: UserDrama) => void
  onOpenPerson: (id: number, name?: string) => void
}

export default function WatchlistTab({ onOpenDrama }: WatchlistTabProps) {
  const [dramas, setDramas] = useState<UserDrama[]>(() =>
    getSavedDramasSync().filter((d) => d.status === 'watchlist')
  )
  const [loading, setLoading] = useState(dramas.length === 0)

  async function load() {
    const data = await getUserDramas('watchlist')
    setDramas(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const unsubscribe = onArchiveSync((allDramas) => {
      setDramas(allDramas.filter((d) => d.status === 'watchlist'))
    })
    return () => unsubscribe()
  }, [])

  function handleOpenDrama(drama: UserDrama) {
    ;(document.activeElement as HTMLElement)?.blur()
    onOpenDrama(drama.tmdb_id, drama)
  }

  async function handleMove(dramaId: string, status: 'watching' | 'finished') {
    await moveDrama(dramaId, status)
  }

  async function handleRemove(dramaId: string) {
    await removeDrama(dramaId)
  }

  if (loading && dramas.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" />
      </div>
    )
  }

  if (dramas.length === 0) {
    return (
      <div className="relative flex min-h-[75vh] flex-col items-center justify-center px-6 pt-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.14] bg-white/[0.06] shadow-xl backdrop-blur-md mb-4">
          <Bookmark size={32} className="text-sky-400/70" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">Your Watchlist is Empty</h3>
        <p className="mt-1 text-sm text-white/45 max-w-xs">
          Discover new K-Dramas, C-Dramas, and J-Dramas in Search and tap the bookmark icon to save them here.
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen px-4 pb-36 pt-20 max-w-7xl mx-auto animate-ios-spring">
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.18),_transparent_65%)]" />
      </div>

      <div className="relative z-10 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/30 bg-sky-500/15 text-sky-400 shadow-lg shadow-sky-500/20 backdrop-blur-md">
            <Bookmark size={18} className="fill-sky-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Watchlist</h2>
            <p className="text-xs text-white/40">Dramas you plan to watch</p>
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
                  title="Start Watching"
                  onClick={() => handleMove(drama.drama_id, 'watching')}
                  className="flex-1 h-7 rounded-full bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#04111d] font-bold text-[11px] shadow-[0_0_16px_rgba(56,189,248,0.45)] active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation select-none"
                >
                  <Play size={10} className="fill-[#04111d]" />
                  <span>Watch</span>
                </button>
                <button
                  title="Mark Finished"
                  onClick={() => handleMove(drama.drama_id, 'finished')}
                  className="w-7 h-7 rounded-full bg-white/[0.14] hover:bg-white/[0.24] border border-white/[0.18] text-white active:scale-90 transition flex items-center justify-center cursor-pointer touch-manipulation select-none"
                >
                  <CheckCircle size={12} strokeWidth={2.5} />
                </button>
                <button
                  title="Remove from Watchlist"
                  onClick={() => handleRemove(drama.drama_id)}
                  className="w-7 h-7 rounded-full bg-white/[0.14] hover:bg-white/[0.24] border border-white/[0.18] text-white/70 hover:text-white active:scale-90 transition flex items-center justify-center cursor-pointer touch-manipulation select-none"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            }
          />
        ))}
      </div>
    </div>
  )
}
