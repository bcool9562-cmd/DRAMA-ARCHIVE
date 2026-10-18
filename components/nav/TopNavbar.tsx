'use client'

import { Bell } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getNotifiableDramas } from '@/lib/supabase/archive'
import ScenovaLogo from '@/components/brand/ScenovaLogo'
import { haptic } from '@/lib/haptics'

interface TopNavbarProps {
  onLogoClick?: () => void
  onNotificationsClick: () => void
  onLockClick: () => void
}

export default function TopNavbar({
  onLogoClick,
  onNotificationsClick,
  onLockClick,
}: TopNavbarProps) {
  const [notifCount, setNotifCount] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    getNotifiableDramas().then((dramas) => setNotifCount(dramas.length))
  }, [])

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 12)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top,0px)] h-[calc(4rem+env(safe-area-inset-top,0px))] w-full transition-all duration-300 ease-out select-none transform-gpu translate-z-0 ${
        isScrolled
          ? 'backdrop-blur-md bg-[#050507]/68 border-b border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.8)]'
          : 'bg-[#050507] border-b border-white/[0.08]'
      }`}
    >
      {/* Inner centered container matches max-w-6xl mx-auto w-full px-6 */}
      <div className="max-w-6xl mx-auto w-full h-16 px-6 flex items-center justify-between">
        {/* Brand Identity: -ml-3 sm:-ml-4 offsets logo slightly to the left of Explore without drifting far left */}
        <button
          type="button"
          onClick={onLogoClick}
          className="-ml-3 sm:-ml-4 group flex items-center gap-2.5 hover:opacity-90 active:scale-95 transition-all duration-200 cursor-pointer touch-manipulation text-left outline-none select-none py-1"
          aria-label="SCENOVA Home"
        >
          <ScenovaLogo className="w-8 h-8 flex-shrink-0 transition-transform duration-200 group-hover:scale-105" />

          {/* Crisp, solid wordmark: SCEN in pure white, OVA in crisp rose-pink with ZERO outer blur/drop-shadow */}
          <span className="font-[family-name:var(--font-unbounded)] text-[22px] font-black tracking-tight leading-none select-none text-white">
            SCEN<span className="text-[#F472B6]">OVA</span>
          </span>
        </button>

        {/* Right Controls: ONLY Airing Alerts & Lock Archive */}
        <div className="relative flex items-center gap-2">
          {/* Airing Alerts Capsule */}
          <button
            type="button"
            onClick={() => {
              haptic.light()
              onNotificationsClick()
            }}
            className="
              relative h-9 px-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14]
              backdrop-blur-xl border border-white/[0.14] text-white/90
              flex items-center gap-2 text-xs font-semibold
              overflow-hidden cursor-pointer touch-manipulation select-none group
              hover:scale-[1.05] active:scale-[0.94]
              transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]
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

          {/* Lock Archive Capsule */}
          <button
            type="button"
            onClick={() => {
              haptic.light()
              onLockClick()
            }}
            title="Lock Archive"
            className="
              relative h-9 px-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14]
              backdrop-blur-xl border border-white/[0.14] text-white/90
              flex items-center gap-2 text-xs font-semibold
              overflow-hidden cursor-pointer touch-manipulation select-none group
              hover:scale-[1.05] active:scale-[0.94]
              transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]
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
      </div>
    </header>
  )
}
