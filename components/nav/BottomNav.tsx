'use client'

import { Bell, Search, Bookmark, Play, CheckCircle, Lock } from 'lucide-react'
import { getNotifiableDramas } from '@/lib/supabase/archive'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export type TabId = 'search' | 'watchlist' | 'watching' | 'finished'

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  onNotificationsClick: () => void
  onLockClick: () => void
}

const TABS = [
  { id: 'search' as TabId, label: 'Search', icon: Search },
  { id: 'watchlist' as TabId, label: 'Watchlist', icon: Bookmark },
  { id: 'watching' as TabId, label: 'Watching', icon: Play },
  { id: 'finished' as TabId, label: 'Finished', icon: CheckCircle },
]

export default function BottomNav({
  activeTab,
  onTabChange,
  onNotificationsClick,
  onLockClick,
}: BottomNavProps) {
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    getNotifiableDramas().then((dramas) => setNotifCount(dramas.length))
  }, [])

  return (
    <>
      {/* Top Header Bar — floating glass bar with comfortable breathing room from screen top */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between pt-4 sm:pt-5 pb-3 px-5 sm:px-8 mt-[env(safe-area-inset-top,0px)]">
        {/* Official Drama Archive Brand Mark: Luminous Glass Squircle Emblem + Refined Editorial Wordmark */}
        <div className="pointer-events-auto flex items-center gap-2.5 touch-manipulation select-none">
          {/* Luminous Glass Squircle Emblem */}
          <div className="w-10 h-10 rounded-[13px] relative overflow-hidden flex items-center justify-center bg-white/[0.08] backdrop-blur-xl border border-white/[0.22] shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_8px_24px_-4px_rgba(139,92,246,0.5)] flex-shrink-0">
            {/* Animated radial aurora glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(244,114,182,0.85),rgba(139,92,246,0.75)_55%,rgba(59,130,246,0.6)_100%)] opacity-90 animate-pulse [animation-duration:4s]" />
            {/* Custom double-layer translucent glass Cinema Prism / Play-Ribbon SVG icon */}
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 relative z-10">
              <path
                d="M7.5 5.2v13.6c0 .9 1.1 1.45 1.8.95l10.8-6.8a1.1 1.1 0 0 0 0-1.9L9.3 4.25c-.7-.5-1.8.05-1.8.95z"
                fill="white"
                fillOpacity={0.25}
              />
              <path
                d="M8.5 6.7v10.6a.7.7 0 0 0 1.08.6l8.4-5.3a.7.7 0 0 0 0-1.2l-8.4-5.3a.7.7 0 0 0-1.08.6z"
                fill="white"
              />
              <path
                d="M8.5 6.7L18 12.7L8.5 12V6.7z"
                fill="white"
                fillOpacity={0.35}
              />
            </svg>
          </div>

          {/* Refined Editorial Wordmark with subtle tonal contrast & glowing Living Flow dot */}
          <span className="flex items-baseline leading-none select-none">
            <span className="text-[22px] sm:text-[24px] font-extrabold tracking-[-0.035em] text-white">
              Drama
            </span>
            <span className="text-[22px] sm:text-[24px] font-bold tracking-[-0.03em] bg-gradient-to-b from-white via-white/90 to-white/55 bg-clip-text text-transparent ml-1.5">
              Archive
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_10px_#e879f9] inline-block ml-1 mb-0.5" />
          </span>
        </div>

        {/* Right Controls: Notification Bell Capsule + Lock Capsule */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {/* Notification Bell Capsule: Luminous rim-lit glass capsule with internal rose-amber-violet radial light bloom */}
          <button
            onClick={onNotificationsClick}
            className="
              relative h-10 px-3.5 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.2]
              shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_6px_20px_-4px_rgba(244,63,94,0.35)]
              flex items-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
              hover:scale-105 active:scale-90 group overflow-hidden cursor-pointer touch-manipulation select-none
            "
            aria-label="Airing Alerts"
          >
            {/* Internal Living Flow rose-amber-violet radial light bloom */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(251,113,133,0.38),rgba(168,85,247,0.2)_60%,transparent_100%)] opacity-85 group-hover:opacity-100 transition-opacity" />

            {/* Swinging Bell SVG */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="relative z-10 w-4 h-4 text-white/90 group-hover:rotate-[14deg] transition-transform duration-300 origin-top"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>

            {/* Integrated count inside glowing pill */}
            {notifCount > 0 ? (
              <span className="relative z-10 text-xs font-bold text-rose-200 bg-rose-500/30 border border-rose-400/40 px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)] leading-none">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            ) : (
              <span className="relative z-10 text-xs font-semibold text-white/70">
                Alerts
              </span>
            )}
          </button>

          {/* Lock Capsule: Matching luminous frosted glass capsule with indigo-cyan-violet radial light bloom */}
          <button
            onClick={onLockClick}
            title="Lock Archive"
            className="
              relative h-10 px-4 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.2]
              shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_6px_20px_-4px_rgba(99,102,241,0.35)]
              flex items-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
              hover:scale-105 active:scale-90 group overflow-hidden cursor-pointer touch-manipulation select-none
            "
            aria-label="Lock Archive"
          >
            {/* Internal Living Flow indigo-cyan-violet radial light bloom */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(99,102,241,0.42),rgba(56,189,248,0.22)_60%,transparent_100%)] opacity-85 group-hover:opacity-100 transition-opacity" />

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="relative z-10 w-3.5 h-3.5 text-white/90 group-hover:text-cyan-300 group-hover:scale-110 transition-all duration-200"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="relative z-10 text-[13px] font-semibold text-white tracking-tight">
              Lock
            </span>
          </button>
        </div>
      </header>

      {/* Floating Glass Bottom Dock with Living Flow Glow and Elastic Spring Physics */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[env(safe-area-inset-bottom,20px)] px-4">
        <nav
          className="
            pointer-events-auto relative flex items-center gap-1
            rounded-full border border-white/[0.18]
            bg-black/75 px-2.5 py-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.25)]
            backdrop-blur-2xl will-change-transform touch-manipulation select-none
          "
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`
                  relative flex flex-col items-center gap-0.5 rounded-full px-4 py-2
                  transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                  cursor-pointer touch-manipulation select-none active:scale-90
                  ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}
                `}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavTab"
                    className="absolute inset-0 rounded-full bg-white/[0.14] border border-white/[0.22] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_0_24px_rgba(168,85,247,0.45)] backdrop-blur-md overflow-hidden"
                    transition={{ type: 'spring', stiffness: 450, damping: 28, mass: 0.8 }}
                  >
                    {/* Subtle internal Living Flow glow behind active tab */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.45),rgba(244,63,94,0.18)_55%,transparent_75%)]" />
                  </motion.div>
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className={`relative z-10 transition-transform ${isActive ? 'text-white scale-105' : 'text-white/50'}`}
                  fill={id === 'watchlist' && isActive ? 'currentColor' : 'none'}
                />
                <span className={`relative z-10 text-[10px] font-semibold tracking-wide ${isActive ? 'text-white font-bold' : 'text-white/40'}`}>
                  {label}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}
