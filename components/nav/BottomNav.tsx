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
      {/* Top Header Bar */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between p-4 pt-[env(safe-area-inset-top,16px)]">
        {/* Official Drama Archive Brand Header */}
        <div className="pointer-events-auto flex items-center gap-2.5 touch-manipulation select-none">
          <div className="w-9 h-9 rounded-[11px] bg-white/[0.08] backdrop-blur-xl border border-white/[0.15] flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_6px_18px_rgba(0,0,0,0.35)]">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
              <path
                d="M12 3 L20 7.5 L20 16.5 L12 21 L4 16.5 L4 7.5 Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="currentColor"
                fillOpacity={0.15}
              />
              <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
              <polygon points="11,10 15,12 11,14" fill="currentColor" />
            </svg>
          </div>
          <span className="text-[19px] font-bold tracking-tight text-white leading-none">
            Drama Archive
          </span>
        </div>

        {/* Right Controls: Notification Bell + Lock Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Notification Bell */}
          <button
            onClick={onNotificationsClick}
            className="
              relative flex h-9 w-9 items-center justify-center
              rounded-full bg-gradient-to-b from-white/[0.16] to-white/[0.06]
              border border-white/[0.22] shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_8px_24px_rgba(0,0,0,0.4)]
              backdrop-blur-xl transition active:scale-95 cursor-pointer touch-manipulation select-none
            "
            aria-label="Notifications"
          >
            <Bell size={16} className="text-white/90" />
            {notifCount > 0 && (
              <span className="
                absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center
                rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-md shadow-rose-500/50
              ">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {/* Lock / Log Out Button */}
          <button
            onClick={onLockClick}
            title="Lock Archive"
            className="
              group relative inline-flex items-center gap-1.5 rounded-full p-1 pr-3
              bg-gradient-to-b from-white/[0.16] to-white/[0.06] backdrop-blur-xl border border-white/[0.22]
              shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_8px_24px_rgba(0,0,0,0.4)]
              transition active:scale-95 cursor-pointer touch-manipulation select-none
            "
            aria-label="Lock Archive"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/80 to-purple-600/80 text-white shadow-inner">
              <Lock size={12} />
            </div>
            <span className="text-xs font-semibold text-white/90">Lock</span>
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
