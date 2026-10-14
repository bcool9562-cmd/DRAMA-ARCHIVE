'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, Bell, BellRing, Calendar, Sparkles, Check } from 'lucide-react'
import { getNotifiableDramas, UserDrama } from '@/lib/supabase/archive'

interface NotificationSheetProps {
  onClose: () => void
  onDramaClick: (tmdbId: number) => void
}

export default function NotificationSheet({ onClose, onDramaClick }: NotificationSheetProps) {
  const [dramas, setDramas] = useState<UserDrama[]>([])
  const [loading, setLoading] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }

    getNotifiableDramas().then((data) => {
      setDramas(data)
      setLoading(false)

      // If notifications are permitted, trigger native browser notification for any airing today
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const todayStr = new Date().toISOString().slice(0, 10)
        data.forEach(d => {
          const airDate = d.next_episode_date || d.first_air_date
          if (airDate && airDate <= todayStr) {
            new Notification(`Drama Airing Alert: ${d.title}`, {
              body: d.status === 'watchlist'
                ? `Premiere is here! Episode 1 has aired.`
                : `New Episode ${d.next_episode_number || ''} is now airing!`,
              icon: d.poster_url || '/icon-192.png'
            })
          }
        })
      }
    })
  }, [])

  async function requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      setPermission(perm)
    }
  }

  const upcomingPremieres = dramas.filter(d => d.status === 'watchlist')
  const newEpisodes = dramas.filter(d => d.status === 'watching')

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border-t border-white/[0.12] bg-[#0a0a0f]"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-white/60 hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Bell className="text-purple-400" size={20} />
            <h2 className="text-lg font-bold text-white">Airing Alerts</h2>
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            Premieres for Watchlist & new episodes for ongoing dramas
          </p>

          {/* Browser Notification Permission Banner */}
          {permission !== 'granted' ? (
            <button
              onClick={requestNotificationPermission}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/20 active:scale-[0.98]"
            >
              <BellRing size={15} />
              Enable Native Device Notifications
            </button>
          ) : (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-green-400">
              <Check size={14} /> Device notifications active
            </div>
          )}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
            </div>
          ) : dramas.length === 0 ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/[0.08]">
                <Sparkles size={22} className="text-white/40" />
              </div>
              <p className="text-sm text-white/60">No pending airing alerts.</p>
              <p className="text-xs text-white/30 max-w-xs">
                Add upcoming dramas to your Watchlist or ongoing series to Currently Watching to track episode airings automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {newEpisodes.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400/80 mb-2.5">
                    Ongoing Watching — Next Episodes
                  </h3>
                  <div className="space-y-2">
                    {newEpisodes.map(d => (
                      <NotificationItem
                        key={d.drama_id}
                        drama={d}
                        badge={`Ep ${d.next_episode_number || 'Next'} · ${d.next_episode_date || 'TBA'}`}
                        badgeColor="bg-purple-500/15 border-purple-500/30 text-purple-300"
                        onClick={() => onDramaClick(d.tmdb_id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {upcomingPremieres.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-pink-400/80 mb-2.5">
                    Watchlist — Upcoming Premieres
                  </h3>
                  <div className="space-y-2">
                    {upcomingPremieres.map(d => (
                      <NotificationItem
                        key={d.drama_id}
                        drama={d}
                        badge={d.first_air_date ? `Premiere: ${d.first_air_date}` : 'Upcoming Premiere'}
                        badgeColor="bg-pink-500/15 border-pink-500/30 text-pink-300"
                        onClick={() => onDramaClick(d.tmdb_id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationItem({
  drama,
  badge,
  badgeColor,
  onClick
}: {
  drama: UserDrama
  badge: string
  badgeColor: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2.5 text-left transition hover:bg-white/[0.08] active:scale-[0.99]"
    >
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-white/[0.05]">
        {drama.poster_url ? (
          <Image src={drama.poster_url} alt={drama.title} fill className="object-cover" sizes="44px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-white/20">?</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-white truncate">{drama.title}</h4>
        {drama.native_title && (
          <p className="text-xs text-white/40 truncate">{drama.native_title}</p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeColor}`}>
            <Calendar size={10} />
            {badge}
          </span>
        </div>
      </div>
    </button>
  )
}
