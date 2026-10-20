'use client'

import { useEffect, useState, useMemo } from 'react'
import SafeImage from '@/components/ui/SafeImage'
import { X, Sparkles, ChevronRight } from 'lucide-react'
import { onArchiveSync, getSavedDramasSync, type UserDrama } from '@/lib/supabase/archive'
import { haptic } from '@/lib/haptics'

interface NotificationSheetProps {
  onClose: () => void
  onDramaClick: (tmdbId: number) => void
  savedDramas?: UserDrama[]
}

function formatAiringCountdown(dateStr?: string | null): { text: string; isHot: boolean } {
  if (!dateStr) return { text: 'TBA', isHot: false }
  const target = new Date(dateStr)
  if (isNaN(target.getTime())) return { text: dateStr, isHot: false }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const diffDays = Math.round((targetDay - today) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return { text: 'Today', isHot: true }
  if (diffDays === 1) return { text: 'Tomorrow', isHot: true }
  if (diffDays > 1 && diffDays <= 7) return { text: `In ${diffDays} Days`, isHot: true }
  if (diffDays > 7 && diffDays <= 30) return { text: `In ${diffDays} Days`, isHot: false }
  // Never show past badges in airing alerts
  if (diffDays < 0) return { text: 'Today', isHot: true }

  return {
    text: target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    isHot: false,
  }
}

function getInitialAiringCache(currentSaved: UserDrama[]): UserDrama[] {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('scenova_airing_cache')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Strictly filter cached alerts against current watchlist & watching dramas
          const watchlistIds = new Set(
            currentSaved.filter((s) => s.status === 'watchlist').map((s) => String(s.tmdb_id || s.drama_id))
          )
          const watchingIds = new Set(
            currentSaved.filter((s) => s.status === 'watching').map((s) => String(s.tmdb_id || s.drama_id))
          )
          return parsed.filter(
            (p) =>
              (p.status === 'watchlist' && watchlistIds.has(String(p.tmdb_id || p.drama_id))) ||
              (p.status === 'watching' && watchingIds.has(String(p.tmdb_id || p.drama_id)))
          )
        }
      }
    } catch { /* ignore */ }
  }
  return []
}

export default function NotificationSheet({
  onClose,
  onDramaClick,
  savedDramas: propSavedDramas,
}: NotificationSheetProps) {
  const [liveSavedDramas, setLiveSavedDramas] = useState<UserDrama[]>(
    () => propSavedDramas || getSavedDramasSync()
  )
  const [rawAlerts, setRawAlerts] = useState<UserDrama[]>(() =>
    getInitialAiringCache(liveSavedDramas)
  )
  const [loading, setLoading] = useState(
    rawAlerts.length === 0 &&
      liveSavedDramas.some((d) => d.status === 'watchlist' || d.status === 'watching')
  )

  // Keep liveSavedDramas strictly in sync with archive mutations across all tabs
  useEffect(() => {
    if (propSavedDramas) {
      setLiveSavedDramas(propSavedDramas)
    }
    const unsub = onArchiveSync((updated) => {
      setLiveSavedDramas(updated)
    })
    return () => unsub()
  }, [propSavedDramas])

  // Fetch or re-sync alerts whenever watchlist or watching list changes
  useEffect(() => {
    const activeWatching = liveSavedDramas.filter((d) => d.status === 'watching')
    const activeWatchlist = liveSavedDramas.filter((d) => d.status === 'watchlist')

    // If user has NO dramas in watching and NO dramas in watchlist, immediately show 0 alerts
    if (activeWatching.length === 0 && activeWatchlist.length === 0) {
      setRawAlerts([])
      setLoading(false)
      try {
        localStorage.removeItem('scenova_airing_cache')
      } catch { /* ignore */ }
      return
    }

    setLoading(true)
    fetch('/api/airing')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setRawAlerts(data)
          try {
            localStorage.setItem('scenova_airing_cache', JSON.stringify(data))
          } catch { /* ignore */ }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [liveSavedDramas.length])

  // STRICT RULE: Only show alerts for dramas currently in Watchlist or Watching
  const { newEpisodes, upcomingPremieres, totalAlertsCount } = useMemo(() => {
    const activeWatchlistIds = new Set(
      liveSavedDramas
        .filter((d) => d.status === 'watchlist')
        .map((d) => String(d.tmdb_id || d.drama_id))
    )
    const activeWatchingIds = new Set(
      liveSavedDramas
        .filter((d) => d.status === 'watching')
        .map((d) => String(d.tmdb_id || d.drama_id))
    )

    const nextEps = rawAlerts.filter(
      (d) => d.status === 'watching' && activeWatchingIds.has(String(d.tmdb_id || d.drama_id))
    )
    const premieres = rawAlerts.filter(
      (d) => d.status === 'watchlist' && activeWatchlistIds.has(String(d.tmdb_id || d.drama_id))
    )

    return {
      newEpisodes: nextEps,
      upcomingPremieres: premieres,
      totalAlertsCount: nextEps.length + premieres.length,
    }
  }, [rawAlerts, liveSavedDramas])

  // Cascade stagger counter shared across sections
  let staggerIndex = 0

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/75 max-md:backdrop-blur-none md:backdrop-blur-md touch-manipulation transition-opacity duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Floating 4-Corner Rounded Glass Card with Smooth Entrance Animation (400ms cubic-bezier(0.16, 1, 0.3, 1)) */}
      <div
        className="fixed top-20 left-1/2 -translate-x-1/2 sm:left-auto sm:right-8 sm:translate-x-0 w-[calc(100vw-24px)] max-w-[420px] max-h-[80vh] flex flex-col overflow-hidden rounded-[28px] bg-[#101018]/90 max-md:backdrop-blur-none md:backdrop-blur-3xl border border-white/[0.18] shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_24px_60px_rgba(0,0,0,0.85)] z-[125] animate-alerts-entrance max-sm:origin-top sm:origin-top-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Living Flow ambient light header glow */}
        <div className="pointer-events-none absolute -top-20 inset-x-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.35),rgba(244,63,94,0.18)_50%,transparent_80%)]" />

        {/* Clean Header Row: Title + Close Button */}
        <div className="relative z-10 px-5 pt-4 pb-4 border-b border-white/[0.10] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-white flex items-baseline">
              Airing Alerts
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa] inline-block ml-1.5 mb-0.5" />
            </h2>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              haptic.light()
              onClose()
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.12] text-white/70 hover:text-white transition active:scale-90 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Subtitle Bar */}
        <div className="relative z-10 px-5 py-2 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between text-[11px] text-white/45">
          <span>Track upcoming episodes & series premieres</span>
          <span className="font-semibold text-white/60">{totalAlertsCount} alerts</span>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-hide space-y-6">
          {loading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-[22px] bg-white/[0.04] border border-white/[0.08] animate-pulse"
                />
              ))}
            </div>
          ) : totalAlertsCount === 0 ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3.5 text-center px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.06] border border-white/[0.12] shadow-lg shadow-purple-900/20">
                <Sparkles size={26} className="text-purple-300" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-white">All Caught Up</p>
                <p className="mt-1 text-xs text-white/40 max-w-xs leading-relaxed">
                  Add upcoming dramas to your Watchlist or ongoing series to Currently Watching to track airings automatically.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. Next Episodes (Ongoing Watching Dramas) */}
              {newEpisodes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
                    <h3 className="text-[13px] font-semibold text-white/70 tracking-tight">
                      Next Episodes
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {newEpisodes.map((d) => {
                      const countdown = formatAiringCountdown(d.next_episode_date)
                      const itemDelay = `${staggerIndex++ * 35}ms`
                      return (
                        <div
                          key={`watching-${d.drama_id}`}
                          onClick={() => {
                            haptic.light()
                            onDramaClick(d.tmdb_id)
                          }}
                          style={{ animationDelay: itemDelay }}
                          className="
                            animate-alert-row relative overflow-hidden rounded-[22px] bg-white/[0.06] hover:bg-white/[0.10]
                            max-md:backdrop-blur-none md:backdrop-blur-xl border border-white/[0.14] p-3 flex items-center justify-between gap-3.5
                            shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_20px_rgba(0,0,0,0.35)]
                            transition-all duration-250 active:scale-[0.98] cursor-pointer group
                          "
                        >
                          {/* Directional Living Flow edge glow */}
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(168,85,247,0.28),transparent_65%)]" />

                          {/* Left: Poster + Title + Episode badge */}
                          <div className="relative z-10 flex items-center gap-3 min-w-0">
                            <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-[12px] bg-[#14141e] shadow-md border border-white/[0.12]">
                              <SafeImage
                                src={d.poster_url}
                                alt={d.title}
                                size="w342"
                                proxyWidth={342}
                                fill
                                className="object-cover"
                                sizes="48px"
                                fallbackText="?"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[14px] font-bold text-white tracking-tight truncate group-hover:text-purple-200 transition-colors">
                                {d.title}
                              </h4>
                              {d.native_title && (
                                <p className="text-[11px] text-white/40 truncate">
                                  {d.native_title}
                                </p>
                              )}
                              <div className="mt-1 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 text-[10px] font-bold text-purple-200">
                                  Episode {d.next_episode_number || d.watched_episodes || 1}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Luminous Glass Countdown Pill */}
                          <div className="relative z-10 flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`
                                rounded-full border px-3 py-1.5 text-xs font-bold text-white shadow-lg
                                ${
                                  countdown.isHot
                                    ? 'bg-gradient-to-r from-purple-500/40 to-pink-500/40 border-purple-400/40 shadow-[0_0_16px_rgba(168,85,247,0.35)]'
                                    : 'bg-white/[0.12] border-white/[0.2] shadow-[0_0_12px_rgba(255,255,255,0.1)]'
                                }
                              `}
                            >
                              {countdown.text}
                            </span>
                            <ChevronRight
                              size={15}
                              className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 2. Upcoming Premieres (Watchlist Dramas) */}
              {upcomingPremieres.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#fb7185]" />
                    <h3 className="text-[13px] font-semibold text-white/70 tracking-tight">
                      Upcoming Premieres
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {upcomingPremieres.map((d) => {
                      const countdown = formatAiringCountdown(d.first_air_date)
                      const itemDelay = `${staggerIndex++ * 35}ms`
                      return (
                        <div
                          key={`watchlist-${d.drama_id}`}
                          onClick={() => {
                            haptic.light()
                            onDramaClick(d.tmdb_id)
                          }}
                          style={{ animationDelay: itemDelay }}
                          className="
                            animate-alert-row relative overflow-hidden rounded-[22px] bg-white/[0.06] hover:bg-white/[0.10]
                            max-md:backdrop-blur-none md:backdrop-blur-xl border border-white/[0.14] p-3 flex items-center justify-between gap-3.5
                            shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_20px_rgba(0,0,0,0.35)]
                            transition-all duration-250 active:scale-[0.98] cursor-pointer group
                          "
                        >
                          {/* Directional Living Flow edge glow */}
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(244,63,94,0.28),transparent_65%)]" />

                          {/* Left: Poster + Title + Premiere badge */}
                          <div className="relative z-10 flex items-center gap-3 min-w-0">
                            <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-[12px] bg-[#14141e] shadow-md border border-white/[0.12]">
                              <SafeImage
                                src={d.poster_url}
                                alt={d.title}
                                size="w342"
                                proxyWidth={342}
                                fill
                                className="object-cover"
                                sizes="48px"
                                fallbackText="?"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[14px] font-bold text-white tracking-tight truncate group-hover:text-rose-200 transition-colors">
                                {d.title}
                              </h4>
                              {d.native_title && (
                                <p className="text-[11px] text-white/40 truncate">
                                  {d.native_title}
                                </p>
                              )}
                              <div className="mt-1 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-400/30 px-2 py-0.5 text-[10px] font-bold text-rose-200">
                                  Series Premiere
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Luminous Glass Countdown Pill */}
                          <div className="relative z-10 flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`
                                rounded-full border px-3 py-1.5 text-xs font-bold text-white shadow-lg
                                ${
                                  countdown.isHot
                                    ? 'bg-gradient-to-r from-rose-500/40 to-pink-500/40 border-rose-400/40 shadow-[0_0_16px_rgba(244,63,94,0.35)]'
                                    : 'bg-white/[0.12] border-white/[0.2] shadow-[0_0_12px_rgba(255,255,255,0.1)]'
                                }
                              `}
                            >
                              {countdown.text}
                            </span>
                            <ChevronRight
                              size={15}
                              className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition"
                            />
                          </div>
                        </div>
                      )
                    })}
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
