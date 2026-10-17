'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, Sparkles, ChevronRight, Bell, BellRing } from 'lucide-react'
import { getNotifiableDramas, UserDrama } from '@/lib/supabase/archive'
import { haptic } from '@/lib/haptics'
import { subscribeToPush, unsubscribeFromPush } from '@/lib/pushClient'
import { generateWittyDramaNotification } from '@/lib/dramaNotifications'
import { showDynamicIsland } from './DynamicIslandBanner'

interface NotificationSheetProps {
  onClose: () => void
  onDramaClick: (tmdbId: number) => void
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
  if (diffDays === -1) return { text: 'Yesterday', isHot: false }
  if (diffDays > 1 && diffDays <= 7) return { text: `In ${diffDays} Days`, isHot: true }
  if (diffDays > 7 && diffDays <= 30) return { text: `In ${diffDays} Days`, isHot: false }
  if (diffDays < -1) return { text: `${Math.abs(diffDays)}d Ago`, isHot: false }

  return {
    text: target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    isHot: false,
  }
}

export default function NotificationSheet({ onClose, onDramaClick }: NotificationSheetProps) {
  const [dramas, setDramas] = useState<UserDrama[]>([])
  const [loading, setLoading] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [alertsActive, setAlertsActive] = useState<boolean>(false)
  const [testingPush, setTestingPush] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
      const isEnabled =
        localStorage.getItem('scenova_alerts_enabled') !== 'false' &&
        Notification.permission === 'granted'
      setAlertsActive(isEnabled)
    }

    getNotifiableDramas().then((data) => {
      setDramas(data)
      setLoading(false)

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

  async function toggleAlerts() {
    if (alertsActive) {
      haptic.light()
      await unsubscribeFromPush()
      setAlertsActive(false)
      showDynamicIsland({
        title: '🔕 Alerts Paused',
        body: 'Background drama notifications turned off. Tap to re-enable anytime.',
      })
    } else {
      haptic.success()
      const success = await subscribeToPush()
      if (success) {
        setAlertsActive(true)
        if (typeof window !== 'undefined' && 'Notification' in window) {
          setPermission(Notification.permission)
        }
        showDynamicIsland({
          title: '🔔 Alerts Activated!',
          body: 'You will receive witty drama updates even when SCENOVA is closed.',
        })
      } else {
        haptic.warning()
        showDynamicIsland({
          title: 'Permission Needed',
          body: 'Please allow notification permission in your browser or device settings.',
        })
      }
    }
  }

  async function handleTestNotification() {
    haptic.light()
    setTestingPush(true)

    const upcomingPremieres = dramas.filter(d => d.status === 'watchlist').map(d => ({ title: d.title, tmdb_id: d.tmdb_id }))
    const newEpisodes = dramas.filter(d => d.status === 'watching').map(d => ({ title: d.title, tmdb_id: d.tmdb_id }))

    const witty = generateWittyDramaNotification({
      watchlist: upcomingPremieres,
      watching: newEpisodes,
    })

    // 1. Show immediate in-app Dynamic Island banner
    showDynamicIsland({
      title: witty.title,
      body: witty.body,
    })

    // 2. Schedule 5-second background push (so user can lock their phone to test)
    try {
      await fetch('/api/push/send?delay=5000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(witty),
      })
    } catch {
      // ignore
    } finally {
      setTimeout(() => setTestingPush(false), 2500)
    }
  }

  const upcomingPremieres = dramas.filter(d => d.status === 'watchlist')
  const newEpisodes = dramas.filter(d => d.status === 'watching')

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md touch-manipulation"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Floating 4-Corner Rounded Glass Card — IDENTICAL ON PHONE AND PC */}
      <div
        className="fixed top-20 left-1/2 -translate-x-1/2 sm:left-auto sm:right-8 sm:translate-x-0 w-[calc(100vw-24px)] max-w-[420px] max-h-[80vh] flex flex-col overflow-hidden rounded-[28px] bg-[#101018]/90 backdrop-blur-3xl border border-white/[0.18] shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_24px_60px_rgba(0,0,0,0.85)] z-[125]"
        onClick={e => e.stopPropagation()}
      >
        {/* Living Flow ambient light header glow */}
        <div className="pointer-events-none absolute -top-20 inset-x-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.35),rgba(244,63,94,0.18)_50%,transparent_80%)]" />

        {/* Header Row: Title + Test Bell + Luminous Push Toggle Pill + Close Button */}
        <div className="relative z-10 px-5 pt-4 pb-4 border-b border-white/[0.10] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-white flex items-baseline">
              Airing Alerts
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa] inline-block ml-1.5 mb-0.5" />
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Small Bell Test Button (5s delayed background push & in-app Dynamic Island) */}
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testingPush}
              title="Test Alert (Shows Dynamic Island banner & triggers a 5s background push to lock screen)"
              className="
                relative overflow-hidden flex h-8 w-8 items-center justify-center rounded-full
                bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.14] text-white/80
                hover:text-white transition active:scale-90 cursor-pointer shadow-sm
              "
              aria-label="Test Alert"
            >
              <BellRing
                size={14}
                className={testingPush ? 'animate-spin text-purple-400' : 'text-pink-300 animate-pulse'}
              />
            </button>

            {/* Luminous Push Toggle Pill: True ON / OFF Switch */}
            <button
              type="button"
              onClick={toggleAlerts}
              className="
                relative overflow-hidden rounded-full bg-white/[0.1] hover:bg-white/[0.15] backdrop-blur-md
                border border-white/[0.18] pl-3 pr-2.5 py-1.5 flex items-center gap-2
                text-xs font-semibold text-white active:scale-95 transition cursor-pointer select-none
                shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]
                after:absolute after:inset-0 after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-700 after:bg-gradient-to-r after:from-transparent after:via-white/15 after:to-transparent
              "
              title={alertsActive ? 'Push alerts are ON. Tap to pause' : 'Push alerts are OFF. Tap to enable'}
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    alertsActive
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                      : 'bg-white/30'
                  }`}
                />
                <span className="text-[11px] font-semibold tracking-tight">
                  {alertsActive ? 'Alerts ON' : 'Alerts OFF'}
                </span>
              </span>
              <div
                className={`relative z-10 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  alertsActive
                    ? 'bg-emerald-400/25 text-emerald-300 font-bold'
                    : 'bg-white/10 text-white/40'
                }`}
              >
                {alertsActive ? '✓' : '✕'}
              </div>
            </button>

            {/* Close button */}
            <button
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
        </div>

        {/* Subtitle Bar */}
        <div className="relative z-10 px-5 py-2 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between text-[11px] text-white/45">
          <span>Track upcoming episodes & series premieres</span>
          <span className="font-semibold text-white/60">{dramas.length} alerts</span>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-hide space-y-6">
          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-purple-400" />
            </div>
          ) : dramas.length === 0 ? (
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
              {/* 1. Next Episodes (Ongoing Dramas) */}
              {newEpisodes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
                    <h3 className="text-[13px] font-semibold text-white/70 tracking-tight">
                      Next Episodes
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {newEpisodes.map(d => {
                      const countdown = formatAiringCountdown(d.next_episode_date)
                      return (
                        <div
                          key={d.drama_id}
                          onClick={() => {
                            haptic.light()
                            onDramaClick(d.tmdb_id)
                          }}
                          className="
                            relative overflow-hidden rounded-[22px] bg-white/[0.06] hover:bg-white/[0.10]
                            backdrop-blur-xl border border-white/[0.14] p-3 flex items-center justify-between gap-3.5
                            shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_20px_rgba(0,0,0,0.35)]
                            transition-all duration-250 active:scale-[0.98] cursor-pointer group
                          "
                        >
                          {/* Directional Living Flow edge glow */}
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(139,92,246,0.28),transparent_65%)]" />

                          {/* Left: Poster + Title + Episode label */}
                          <div className="relative z-10 flex items-center gap-3 min-w-0">
                            <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-[12px] bg-white/[0.05] shadow-md border border-white/[0.12]">
                              {d.poster_url ? (
                                <Image src={d.poster_url} alt={d.title} fill className="object-cover" sizes="48px" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-white/30">?</div>
                              )}
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
                                  Ep {d.next_episode_number || 'Next'}
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
                            <ChevronRight size={15} className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 2. Upcoming Premieres (Watchlist) */}
              {upcomingPremieres.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#fb7185]" />
                    <h3 className="text-[13px] font-semibold text-white/70 tracking-tight">
                      Upcoming Premieres
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {upcomingPremieres.map(d => {
                      const countdown = formatAiringCountdown(d.first_air_date)
                      return (
                        <div
                          key={d.drama_id}
                          onClick={() => {
                            haptic.light()
                            onDramaClick(d.tmdb_id)
                          }}
                          className="
                            relative overflow-hidden rounded-[22px] bg-white/[0.06] hover:bg-white/[0.10]
                            backdrop-blur-xl border border-white/[0.14] p-3 flex items-center justify-between gap-3.5
                            shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_20px_rgba(0,0,0,0.35)]
                            transition-all duration-250 active:scale-[0.98] cursor-pointer group
                          "
                        >
                          {/* Directional Living Flow edge glow */}
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(244,63,94,0.28),transparent_65%)]" />

                          {/* Left: Poster + Title + Premiere badge */}
                          <div className="relative z-10 flex items-center gap-3 min-w-0">
                            <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-[12px] bg-white/[0.05] shadow-md border border-white/[0.12]">
                              {d.poster_url ? (
                                <Image src={d.poster_url} alt={d.title} fill className="object-cover" sizes="48px" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-white/30">?</div>
                              )}
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
                            <ChevronRight size={15} className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition" />
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
