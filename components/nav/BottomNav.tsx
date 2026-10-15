'use client'

import { Bell, Search, Bookmark, Play, CheckCircle } from 'lucide-react'
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
        {/* Official Drama Archive Brand Mark: Clean 60fps CSS Hover Animation */}
        <div className="pointer-events-auto group inline-flex items-center gap-2.5 cursor-pointer touch-manipulation select-none transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03] active:scale-95 py-1">
          {/* Left purple-pink circle emblem */}
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-rose-500 flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(236,72,153,0.55)] transition-all duration-300 flex-shrink-0">
            {/* Inner white ring & diamond rotate smoothly */}
            <div className="w-5 h-5 rounded-full border-[1.75px] border-white/90 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
              <div className="w-1.5 h-1.5 rotate-45 bg-white rounded-[1px] shadow-[0_0_6px_#fff]" />
            </div>
          </div>

          {/* Title Text: Stays 100% solid text-white at all times, NO background-clip bugs! */}
          <div className="text-[24px] font-black tracking-tight text-white flex items-baseline leading-none group-hover:tracking-normal transition-all duration-300">
            <span className="text-white">Drama Archive</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block ml-1 mb-0.5 shadow-[0_0_8px_rgba(244,63,94,0.7)] group-hover:-translate-y-1 group-hover:scale-125 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
          </div>
        </div>

        {/* Right Controls: Rich Interactive Hover & Tap Animations (Photo 3) */}
        <div className="pointer-events-auto relative flex items-center gap-2">
          {/* Notification Capsule: Pendulum Bell Ring + Spring Lift + Diagonal Sheen */}
          <button
            onClick={onNotificationsClick}
            className="
              relative h-9 px-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14]
              backdrop-blur-xl border border-white/[0.14] text-white/90
              flex items-center gap-2 text-xs font-semibold
              overflow-hidden cursor-pointer touch-manipulation select-none group
              hover:-translate-y-0.5 hover:scale-[1.04] active:scale-95
              transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
              before:absolute before:inset-0 before:-translate-x-full hover:before:translate-x-full
              before:transition-transform before:duration-700
              before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
            "
            aria-label="Airing Alerts"
          >
            <div className="relative flex items-center justify-center">
              <Bell
                size={14}
                strokeWidth={2}
                className="text-white/90 origin-top group-hover:animate-bell-ring transition-transform"
              />
            </div>
            <span className="relative z-10">Alerts</span>
            {notifCount > 0 && (
              <span className="relative z-10 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(244,63,94,0.8)] transition-all duration-300">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {/* Lock Capsule: Animated Unlatching Shackle + Spring Lift + Diagonal Sheen */}
          <button
            onClick={onLockClick}
            title="Lock Archive"
            className="
              relative h-9 px-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14]
              backdrop-blur-xl border border-white/[0.14] text-white/90
              flex items-center gap-2 text-xs font-semibold
              overflow-hidden cursor-pointer touch-manipulation select-none group
              hover:-translate-y-0.5 hover:scale-[1.04] active:scale-95
              transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
              before:absolute before:inset-0 before:-translate-x-full hover:before:translate-x-full
              before:transition-transform before:duration-700
              before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
            "
            aria-label="Lock Archive"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 text-white/90 overflow-visible relative z-10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M7 11V7a5 5 0 0 1 10 0v4"
                className="origin-bottom-left transition-transform duration-300 ease-out group-hover:-translate-y-[2.5px] group-hover:rotate-[-10deg]"
              />
              <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
                ry="2"
                className="group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] transition-all duration-300"
              />
            </svg>
            <span className="relative z-10">Lock</span>
          </button>
        </div>
      </header>

      {/* Floating Glass Bottom Dock (Clean Dark Glass, No Blue Glow) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[env(safe-area-inset-bottom,20px)] px-4">
        <nav
          className="
            pointer-events-auto relative flex items-center gap-1
            rounded-full border border-white/[0.12]
            bg-[#0d0d14]/85 px-2.5 py-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)]
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
                  transition-all duration-200 ease-out
                  cursor-pointer touch-manipulation select-none active:scale-90
                  ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}
                `}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavTab"
                    className="absolute inset-0 rounded-full bg-white/[0.12] border border-white/[0.15] shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 28, mass: 0.8 }}
                  />
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
