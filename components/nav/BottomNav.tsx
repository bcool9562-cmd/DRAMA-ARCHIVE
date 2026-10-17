'use client'

import { Search, Bookmark, Play, CheckCircle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState<{ left: number; top: number; width: number; height: number; ready: boolean }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    ready: false,
  })

  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = TABS.findIndex((t) => t.id === activeTab)
      const activeBtn = tabRefs.current[activeIndex]
      if (activeBtn) {
        setIndicator({
          left: activeBtn.offsetLeft,
          top: activeBtn.offsetTop,
          width: activeBtn.offsetWidth,
          height: activeBtn.offsetHeight,
          ready: true,
        })
      }
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeTab])

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
        {/* Skiper UI Liquid Sliding Active Pill Indicator */}
        <div
          className="pointer-events-none absolute rounded-full bg-white/[0.12] border border-white/[0.15] shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            top: indicator.top,
            left: 0,
            width: indicator.width,
            height: indicator.height,
            transform: `translate3d(${indicator.left}px, 0, 0)`,
            opacity: indicator.ready ? 1 : 0,
            transitionProperty: 'transform, width, height, opacity',
          }}
        />

        {TABS.map(({ id, label, icon: Icon }, idx) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              ref={(el) => { tabRefs.current[idx] = el }}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
                }
                onTabChange(id)
              }}
              className={`
                relative flex flex-col items-center gap-0.5 rounded-full px-4 py-2
                transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]
                cursor-pointer touch-manipulation select-none
                hover:scale-[1.05] active:scale-[0.94]
                ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}
              `}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
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
