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
        {/* Official Drama Archive Brand Mark */}
        <div className="pointer-events-auto flex items-center gap-2.5 touch-manipulation select-none">
          {/* Left Icon Orb: Vibrant circular gradient orb */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)] flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
              <path
                d="M7 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 7 5.5z"
                fill="currentColor"
              />
            </svg>
          </div>
          {/* Brand Title: Ultra-bold tight Apple typography */}
          <span className="text-[24px] sm:text-[26px] font-black tracking-tighter text-white flex items-baseline leading-none">
            Drama Archive<span className="text-violet-500 ml-0.5">.</span>
          </span>
        </div>

        {/* Right Controls: Notification Bell + Lock Button */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {/* Notification Button */}
          <button
            onClick={onNotificationsClick}
            className="
              relative flex h-10 w-10 items-center justify-center
              rounded-full bg-white/[0.07] hover:bg-white/[0.14]
              backdrop-blur-xl border border-white/[0.14]
              transition-all duration-200 active:scale-90 group
              cursor-pointer touch-manipulation select-none
            "
            aria-label="Notifications"
          >
            {/* Refined Bell SVG that animates with a smooth pendulum ring */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-white/90 group-hover:rotate-12 group-active:-rotate-12 transition-transform duration-300 origin-top"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {notifCount > 0 && (
              <span className="
                absolute -top-1 -right-1 flex min-w-[18px] h-[18px] px-1 items-center justify-center
                rounded-full bg-gradient-to-r from-rose-500 to-pink-600 text-[10px] font-bold text-white
                border border-[#0a0a0f] shadow-lg shadow-rose-500/40 leading-none
              ">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {/* Lock Button: Frosted glass capsule */}
          <button
            onClick={onLockClick}
            title="Lock Archive"
            className="
              h-10 px-4 rounded-full bg-white/[0.07] hover:bg-white/[0.14]
              backdrop-blur-xl border border-white/[0.14] flex items-center gap-2
              text-[13px] font-semibold text-white/90 hover:text-white
              transition-all duration-200 active:scale-95 group
              cursor-pointer touch-manipulation select-none
            "
            aria-label="Lock Archive"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5 text-white/80 group-hover:text-violet-400 group-hover:scale-110 transition-all duration-200"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Floating Glass Bottom Dock with Sliding layoutId Spring Indicator */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[env(safe-area-inset-bottom,20px)] px-4">
        <nav
          className="
            pointer-events-auto relative flex items-center gap-1
            rounded-full border border-white/[0.15]
            bg-black/70 px-2.5 py-1.5 shadow-2xl shadow-black/80
            backdrop-blur-xl will-change-transform touch-manipulation select-none
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
                  transition-colors duration-150 cursor-pointer touch-manipulation select-none active:scale-95
                  ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}
                `}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavTab"
                    className="absolute inset-0 rounded-full bg-white/[0.14] border border-white/[0.18] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] backdrop-blur-md"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className={`relative z-10 transition-transform ${isActive ? 'text-white scale-105' : 'text-white/50'}`}
                  fill={id === 'watchlist' && isActive ? 'currentColor' : 'none'}
                />
                <span className={`relative z-10 text-[10px] font-semibold tracking-wide ${isActive ? 'text-white' : 'text-white/40'}`}>
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
