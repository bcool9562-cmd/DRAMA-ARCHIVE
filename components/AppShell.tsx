'use client'

import { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import Image from 'next/image'
import AuthScreen from '@/components/auth/AuthScreen'
import TopNavbar from '@/components/nav/TopNavbar'
import BottomNav, { TabId } from '@/components/nav/BottomNav'
import SearchTab, { type DiscoverData } from '@/components/tabs/SearchTab'
import WatchlistTab from '@/components/tabs/WatchlistTab'
import WatchingTab from '@/components/tabs/WatchingTab'
import FinishedTab from '@/components/tabs/FinishedTab'
import NotificationSheet from '@/components/notifications/NotificationSheet'
import NavStackModal, { type StackItem } from '@/components/nav/NavStackModal'
import ToastContainer from '@/components/Toast'
import { getSavedDramasSync, onArchiveSync, type UserDrama } from '@/lib/supabase/archive'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default function AppShell() {
  const [isLockChecked, setIsLockChecked] = useState(false)
  const [isLocked, setIsLocked] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search)
        const tabParam = params.get('tab') as TabId
        if (tabParam && ['search', 'watchlist', 'watching', 'finished'].includes(tabParam)) {
          return tabParam
        }
      } catch { /* ignore */ }
    }
    return 'search'
  })
  const [tabSwitchCounts, setTabSwitchCounts] = useState<Record<TabId, number>>({
    search: 0,
    watchlist: 0,
    watching: 0,
    finished: 0,
  })
  const [showNotifications, setShowNotifications] = useState(false)
  const [savedDramas, setSavedDramas] = useState<UserDrama[]>(() => getSavedDramasSync())
  const [discoverData, setDiscoverData] = useState<DiscoverData | null>(null)

  // Pre-paint synchronous lock check — ensures zero open-screen blink on PC & Phone
  useIsomorphicLayoutEffect(() => {
    try {
      const pin = localStorage.getItem('scenova_pin')
      if (pin) {
        // If a pin is configured, fresh app launch or reload MUST start locked
        setIsLocked(true)
        try {
          sessionStorage.removeItem('scenova_unlocked_session')
        } catch { /* ignore */ }
      } else {
        // No pin configured yet
        setIsLocked(false)
      }
    } catch {
      setIsLocked(false)
    }
    setIsLockChecked(true)
  }, [])

  // Auto-lock whenever app is backgrounded, closed, or visibility changes
  useEffect(() => {
    function handleLockOnBackground() {
      if (typeof window !== 'undefined' && localStorage.getItem('scenova_pin')) {
        if (document.visibilityState === 'hidden') {
          setIsLocked(true)
          try {
            sessionStorage.removeItem('scenova_unlocked_session')
          } catch { /* ignore */ }
        }
      }
    }

    function handlePageHide() {
      if (typeof window !== 'undefined' && localStorage.getItem('scenova_pin')) {
        setIsLocked(true)
        try {
          sessionStorage.removeItem('scenova_unlocked_session')
        } catch { /* ignore */ }
      }
    }

    document.addEventListener('visibilitychange', handleLockOnBackground)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handlePageHide)
    return () => {
      document.removeEventListener('visibilitychange', handleLockOnBackground)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handlePageHide)
    }
  }, [])

  // Synchronous tab switching with instant scroll reset before browser paint
  const handleTabChange = useCallback((tab: TabId) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      try {
        window.history.replaceState(null, '', tab === 'search' ? '/' : `/?tab=${tab}`)
      } catch { /* ignore */ }
    }
    setTabSwitchCounts(prev => ({ ...prev, [tab]: prev[tab] + 1 }))
    setActiveTab(tab)
  }, [])

  // Guarantee scroll is at (0, 0) before paint of new tab
  useIsomorphicLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [activeTab])

  // Unified navigation stack — shared across all tabs
  const [navStack, setNavStack] = useState<StackItem[]>([])
  const [navDepth, setNavDepth] = useState(0)

  useEffect(() => {
    const unsub = onArchiveSync(setSavedDramas)
    return () => unsub()
  }, [])

  useEffect(() => {
    fetch('/api/discover?region=ALL')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setDiscoverData(data) })
      .catch(() => {})

    // Silently pre-fetch airing alerts on app mount for 0ms instant display
    fetch('/api/airing')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0 && typeof window !== 'undefined') {
          try {
            localStorage.setItem('scenova_airing_cache', JSON.stringify(data))
          } catch { /* ignore */ }
        }
      })
      .catch(() => {})
  }, [])


  async function handleLock() {
    setIsLocked(true)
    try {
      if (!localStorage.getItem('scenova_pin')) {
        localStorage.setItem('scenova_pin', '@MyPrivate')
      }
      sessionStorage.removeItem('scenova_unlocked_session')
      localStorage.setItem('drama_archive_unlocked', 'false')
      fetch('/api/auth/lock', { method: 'POST' }).catch(() => {})
    } catch { /* ignore */ }
  }

  const handleNavEmpty = useCallback(() => setNavStack([]), [])
  const handleNavStackChange = useCallback((depth: number) => setNavDepth(depth), [])

  // Called by tabs to open a drama or person page
  function openDrama(id: number, preview?: any) {
    setNavStack([{ type: 'drama', id, preview }])
  }
  function openPerson(id: number, name?: string) {
    setNavStack([{ type: 'person', id, name }])
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__openDrama = openDrama
      ;(window as any).__openPerson = openPerson
    }
  }, [])

  // 1. While determining lock state, render solid black screen (NO BLINK)
  if (!isLockChecked) {
    return <div className="fixed inset-0 bg-[#050507] z-[9999]" />
  }

  // 2. While locked, render ONLY AuthScreen — never render navbar, dock, or tabs
  if (isLocked) {
    return (
      <AuthScreen
        onAuthenticated={() => {
          try {
            sessionStorage.setItem('scenova_unlocked_session', 'true')
            localStorage.setItem('drama_archive_unlocked', 'true')
          } catch { /* ignore */ }
          setIsLocked(false)
        }}
      />
    )
  }

  const modalOpen = navDepth > 0 || navStack.length > 0
  const postersWithImages = savedDramas.filter(d => d.poster_url)
  const ambientArt1 = postersWithImages[0]?.poster_url || null
  const ambientArt2 = postersWithImages[1]?.poster_url || postersWithImages[0]?.poster_url || null

  return (
    <div className={`bg-[#050507] relative min-h-screen overflow-x-hidden text-white ${modalOpen ? 'overflow-hidden' : ''}`}>
      <ToastContainer />

      {/* ── Ambient Background Layer System: ALL backgrounds stay permanently mounted in DOM and cross-fade smoothly ── */}
      {/* 1. Home (Search) Top-Left Purple-Teal Aurora Bloom */}
      <div
        key={`home-aurora-${tabSwitchCounts.search}`}
        className={`pointer-events-none absolute top-0 left-0 right-0 h-[620px] z-0 origin-top-left border-0 !border-none outline-none ring-0 !rounded-none shadow-none ${
          modalOpen ? 'max-md:invisible max-md:pointer-events-none' : ''
        } ${
          activeTab === 'search'
            ? 'opacity-100 animate-aurora-sweep'
            : 'opacity-0 scale-[0.08] transition-opacity duration-700 ease-in-out'
        }`}
        style={{
          transformOrigin: '0% 0%',
          background: 'radial-gradient(circle 780px at 0% 0%, rgba(124, 58, 237, 0.52) 0%, rgba(91, 33, 182, 0.28) 40%, transparent 75%), radial-gradient(circle 650px at 22% 10%, rgba(13, 148, 136, 0.22) 0%, transparent 70%)',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          borderRadius: '0px',
        }}
      />

      {/* 2. Watchlist Ambient Sky-Blue Glow */}
      <div
        className={`pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-700 ease-in-out ${
          modalOpen ? 'max-md:invisible max-md:pointer-events-none' : ''
        } ${
          activeTab === 'watchlist' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.18),_transparent_65%)]" />
      </div>

      {/* 3. Watching Ambient Purple Glow */}
      <div
        className={`pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-700 ease-in-out ${
          modalOpen ? 'max-md:invisible max-md:pointer-events-none' : ''
        } ${
          activeTab === 'watching' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.18),_transparent_65%)]" />
      </div>

      {/* 4. Finished Ambient Emerald Glow */}
      <div
        className={`pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-700 ease-in-out ${
          modalOpen ? 'max-md:invisible max-md:pointer-events-none' : ''
        } ${
          activeTab === 'finished' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.18),_transparent_65%)]" />
      </div>

      {/* Global Ambient Artwork Canvas — ensures all frosted glass surfaces visibly refract real artwork */}
      <div className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none opacity-40 ${modalOpen ? 'max-md:invisible max-md:pointer-events-none' : ''}`}>
        {ambientArt1 && (
          <div className="absolute -top-[15%] -left-[10%] w-[85vw] h-[85vw] max-w-[750px] max-h-[750px] transform-gpu">
            <Image
              src={ambientArt1}
              alt="Ambient Canvas 1"
              fill
              priority
              className="object-cover blur-[75px] saturate-[190%] opacity-50 scale-125 transition-all duration-700"
            />
          </div>
        )}
        {ambientArt2 && (
          <div className="absolute -bottom-[15%] -right-[10%] w-[85vw] h-[85vw] max-w-[750px] max-h-[750px] transform-gpu">
            <Image
              src={ambientArt2}
              alt="Ambient Canvas 2"
              fill
              priority
              className="object-cover blur-[75px] saturate-[190%] opacity-45 scale-125 transition-all duration-700"
            />
          </div>
        )}
      </div>

      {/* Full-Width Solid Black Top Navbar Strip */}
      <TopNavbar
        onLogoClick={() => {
          handleTabChange('search')
        }}
        onNotificationsClick={() => setShowNotifications(true)}
        onLockClick={handleLock}
      />

      {/* Main content — paused/hidden only on mobile when modal is open so phone GPU does NOT render background elements, but visible on PC for genuine Gaussian blur */}
      <main className={`relative z-10 bg-transparent pt-[calc(4rem+env(safe-area-inset-top,0px))] ${modalOpen ? 'max-md:invisible max-md:pointer-events-none' : ''}`}>
        {activeTab === 'search' && (
          <SearchTab
            onOpenDrama={openDrama}
            onOpenPerson={openPerson}
            onTabChange={handleTabChange}
            discoverData={discoverData}
            onDiscoverLoaded={setDiscoverData}
          />
        )}

        {activeTab === 'watchlist' && (
          <WatchlistTab
            onOpenDrama={openDrama}
            onOpenPerson={openPerson}
            activeCount={tabSwitchCounts.watchlist}
          />
        )}

        {activeTab === 'watching' && (
          <WatchingTab
            onOpenDrama={openDrama}
            onOpenPerson={openPerson}
            activeCount={tabSwitchCounts.watching}
          />
        )}

        {activeTab === 'finished' && (
          <FinishedTab
            onOpenDrama={openDrama}
            onOpenPerson={openPerson}
            activeCount={tabSwitchCounts.finished}
          />
        )}
      </main>

      {/* Bottom dock — hidden when modal is open to prevent GPU compositing */}
      {!modalOpen && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      )}

      {/* Notifications sheet */}
      {showNotifications && (
        <NotificationSheet
          onClose={() => setShowNotifications(false)}
          onDramaClick={(tmdbId) => {
            setShowNotifications(false)
            openDrama(tmdbId)
          }}
        />
      )}

      {/* Unified iOS Navigation Stack Modal */}
      {navStack.length > 0 && (
        <NavStackModal
          initialStack={navStack}
          onEmpty={handleNavEmpty}
          onStackChange={handleNavStackChange}
        />
      )}
    </div>
  )
}
