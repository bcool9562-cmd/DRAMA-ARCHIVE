'use client'

import { Bell, Search, Bookmark, Play, CheckCircle, Lock } from 'lucide-react'
import { getNotifiableDramas } from '@/lib/supabase/archive'
import { useState, useEffect } from 'react'

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
        {/* User Pill */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-3.5 py-1.5 backdrop-blur-2xl shadow-lg shadow-black/40">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-[10px] font-extrabold text-white">
            S
          </div>
          <span className="text-xs font-semibold tracking-wide text-white/90">Subho !!</span>
        </div>

        {/* Right Controls: Notification Bell + Lock Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Notification Bell */}
          <button
            onClick={onNotificationsClick}
            className="
              relative flex h-9 w-9 items-center justify-center
              rounded-full border border-white/[0.15] bg-white/[0.08]
              shadow-lg shadow-black/40 backdrop-blur-2xl transition
              hover:bg-white/[0.14] active:scale-95 cursor-pointer
            "
            aria-label="Notifications"
          >
            <Bell size={17} className="text-white/80" />
            {notifCount > 0 && (
              <span className="
                absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center
                rounded-full bg-red-500 text-[9px] font-bold text-white
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
              flex items-center gap-1.5 rounded-full border border-white/[0.15] bg-white/[0.08]
              px-3 py-1.5 text-xs font-medium text-white/80 shadow-lg shadow-black/40 backdrop-blur-2xl transition
              hover:bg-white/[0.14] hover:text-white active:scale-95 cursor-pointer
            "
            aria-label="Lock Archive"
          >
            <Lock size={13} className="text-purple-400" />
            <span className="text-[11px] font-medium">Lock</span>
          </button>
        </div>
      </header>

      {/* Floating Glass Bottom Dock */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[env(safe-area-inset-bottom,20px)] px-4">
        <nav
          className="
            pointer-events-auto flex items-center gap-1
            rounded-full border border-white/[0.15]
            bg-black/60 px-3 py-2 shadow-2xl shadow-black/60
            backdrop-blur-2xl
          "
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`
                  flex flex-col items-center gap-0.5 rounded-full px-4 py-2
                  transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'bg-white/[0.15] text-white'
                    : 'text-white/40 hover:text-white/70'
                  }
                `}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={isActive ? 'text-white' : 'text-white/50'}
                  fill={id === 'watchlist' && isActive ? 'currentColor' : 'none'}
                />
                <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-white' : 'text-white/40'}`}>
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
