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
        {/* Official Drama Archive Brand Mark: Photo 4 Solid White Orb + Unified Editorial Title */}
        <div className="pointer-events-auto flex items-center gap-3 touch-manipulation select-none">
          {/* Left Emblem: Photo 4 solid white circular orb ringed by subtle cyan-blue glow */}
          <div className="relative w-9 h-9 rounded-full bg-white text-[#09090f] shadow-[0_0_20px_rgba(56,189,248,0.45)] flex items-center justify-center flex-shrink-0 transition-transform active:scale-95">
            <div className="pointer-events-none absolute -inset-1 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.35),transparent_70%)]" />
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#09090f] relative z-10 ml-0.5">
              <polygon points="6,4 19,12 6,20" />
            </svg>
          </div>

          {/* Unified Wordmark: Single weight matching Explore. with tightly coupled sky-blue dot */}
          <span className="text-[24px] sm:text-[26px] font-black tracking-tighter text-white leading-none">
            Drama Archive<span className="text-[#38bdf8]">.</span>
          </span>
        </div>

        {/* Right Controls: Photo 4 Milky Frosted Glass Capsules */}
        <div className="pointer-events-auto relative flex items-center gap-2.5">
          {/* Ambient backlight aura (teal-cyan & warm amber) */}
          <div className="pointer-events-none absolute -inset-3 bg-[radial-gradient(circle_at_60%_50%,rgba(45,212,191,0.20),rgba(251,191,36,0.14)_60%,transparent_100%)] blur-lg" />

          {/* Notification Capsule (Photo 4 Bell Capsule) */}
          <button
            onClick={onNotificationsClick}
            className="
              relative h-11 p-1.5 pr-3.5 rounded-full bg-white/[0.12] hover:bg-white/[0.18]
              backdrop-blur-2xl border border-white/[0.22]
              shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.35),0_0_24px_rgba(45,212,191,0.18)]
              flex items-center gap-2.5 active:scale-92 transition-all duration-200
              cursor-pointer touch-manipulation select-none group
            "
            aria-label="Airing Alerts"
          >
            {/* Left Icon Orb: Solid pure-white circle with dark Bell icon */}
            <div className="w-8 h-8 rounded-full bg-white text-[#09090f] flex items-center justify-center shadow-[0_2px_10px_rgba(255,255,255,0.4)] flex-shrink-0 group-hover:scale-105 transition-transform">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-[#09090f] group-hover:rotate-[14deg] transition-transform duration-300 origin-top"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </div>

            {/* Right Content: Alert badge or label */}
            {notifCount > 0 ? (
              <span className="text-xs font-black text-[#04111d] bg-[#38bdf8] px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.6)] leading-none">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            ) : (
              <span className="text-xs font-bold text-white/90 tracking-tight">
                Alerts
              </span>
            )}
          </button>

          {/* Lock Capsule (Photo 4 Control Capsule) */}
          <button
            onClick={onLockClick}
            title="Lock Archive"
            className="
              relative h-11 p-1.5 pr-4 rounded-full bg-white/[0.12] hover:bg-white/[0.18]
              backdrop-blur-2xl border border-white/[0.22]
              shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)]
              flex items-center gap-2.5 active:scale-92 transition-all duration-200
              cursor-pointer touch-manipulation select-none group
            "
            aria-label="Lock Archive"
          >
            {/* Left Icon Orb: Solid pure-white circle with dark Lock icon */}
            <div className="w-8 h-8 rounded-full bg-white text-[#09090f] flex items-center justify-center shadow-[0_2px_10px_rgba(255,255,255,0.4)] flex-shrink-0 group-hover:scale-105 transition-transform">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-[#09090f]"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span className="text-[13px] font-bold text-white tracking-tight">
              Lock
            </span>
          </button>
        </div>
      </header>

      {/* Floating Glass Bottom Dock with Photo 3 Electric Sky-Blue Spotlight Aura */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[env(safe-area-inset-bottom,20px)] px-4">
        <nav
          className="
            pointer-events-auto relative flex items-center gap-1
            rounded-full border border-white/[0.18]
            bg-[#080810]/80 px-2.5 py-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.25)]
            backdrop-blur-2xl will-change-transform touch-manipulation select-none overflow-hidden
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
                    className="absolute inset-0 rounded-full bg-white/[0.14] border border-white/[0.24] shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)] backdrop-blur-md overflow-hidden"
                    transition={{ type: 'spring', stiffness: 450, damping: 28, mass: 0.8 }}
                  >
                    {/* Photo 3 Electric Sky-Blue Spotlight Aura */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.55)_0%,rgba(14,165,233,0.2)_50%,transparent_75%)]" />
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
