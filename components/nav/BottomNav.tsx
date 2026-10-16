'use client'

import { Search, Bookmark, Play, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export type TabId = 'search' | 'watchlist' | 'watching' | 'finished'

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  onNotificationsClick?: () => void
  onLockClick?: () => void
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
}: BottomNavProps) {
  return (
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
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
                }
                onTabChange(id)
              }}
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
  )
}
