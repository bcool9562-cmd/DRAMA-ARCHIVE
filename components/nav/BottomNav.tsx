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
        {/* Official Drama Archive Brand Mark: Matching Explore. Header Style */}
        <div className="pointer-events-auto flex items-center gap-2.5 touch-manipulation select-none">
          {/* Left Badge: Sleek circular gradient badge with thin white inner ring and spark/diamond center */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-rose-500 flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.4)] flex-shrink-0">
            <div className="w-5 h-5 rounded-full border-[1.75px] border-white/90 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rotate-45 bg-white rounded-[1px] shadow-[0_0_6px_#fff]" />
            </div>
          </div>

          {/* Title Text: Bold typography with round glowing rose dot */}
          <div className="text-[24px] font-black tracking-tight text-white flex items-baseline leading-none">
            <span>Drama Archive</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block ml-1 mb-0.5 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
          </div>
        </div>

        {/* Right Controls: Clean, compact frosted dark-glass pills */}
        <div className="pointer-events-auto relative flex items-center gap-2">
          {/* Notification Capsule */}
          <button
            onClick={onNotificationsClick}
            className="
              relative h-9 px-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14]
              backdrop-blur-xl border border-white/[0.14]
              text-white/90 flex items-center gap-2 text-xs font-semibold
              transition active:scale-95 cursor-pointer touch-manipulation select-none
            "
            aria-label="Airing Alerts"
          >
            <Bell size={14} strokeWidth={2} className="text-white/90" />
            <span>Alerts</span>
            {notifCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {/* Lock Capsule */}
          <button
            onClick={onLockClick}
            title="Lock Archive"
            className="
              relative h-9 px-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14]
              backdrop-blur-xl border border-white/[0.14]
              text-white/90 flex items-center gap-2 text-xs font-semibold
              transition active:scale-95 cursor-pointer touch-manipulation select-none
            "
            aria-label="Lock Archive"
          >
            <Lock size={13} strokeWidth={2} className="text-white/90" />
            <span>Lock</span>
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
