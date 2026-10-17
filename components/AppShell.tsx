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
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
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
  }, [])

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => { setIsUnlocked(!!data.unlocked); setAuthChecked(true) })
      .catch(() => { setIsUnlocked(false); setAuthChecked(true) })
  }, [])

  async function handleLock() {
    try { await fetch('/api/auth/lock', { method: 'POST' }) } catch { /* ignore */ }
    setIsUnlocked(false)
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

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060608]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />
      </div>
    )
  }

  if (!isUnlocked) {
    return <AuthScreen onAuthenticated={() => setIsUnlocked(true)} />
  }

  const modalOpen = navDepth > 0
  const postersWithImages = savedDramas.filter(d => d.poster_url)
  const ambientArt1 = postersWithImages[0]?.poster_url || null
  const ambientArt2 = postersWithImages[1]?.poster_url || postersWithImages[0]?.poster_url || null

  return (
    <div className={`bg-[#050507] relative min-h-screen overflow-x-hidden text-white ${modalOpen ? 'overflow-hidden' : ''}`}>
      {/* ── Ambient Background Layer System: ALL backgrounds stay permanently mounted in DOM and cross-fade smoothly ── */}
      {/* 1. Home (Search) Top-Left Purple-Teal Aurora Bloom */}
      <div
        className={`pointer-events-none absolute top-16 left-0 right-0 h-[520px] z-0 origin-top-left transition-all duration-[1500ms] ease-out border-0 !border-none outline-none ring-0 rounded-none shadow-none ${
          activeTab === 'search'
            ? 'opacity-100 scale-100 blur-0'
            : 'opacity-0 scale-[0.12] blur-[30px]'
        }`}
        style={{
          transformOrigin: '0% 0%',
          background: 'radial-gradient(ellipse 50% 85% at 15% 0%, rgba(124, 58, 237, 0.52) 0%, rgba(91, 33, 182, 0.24) 50%, transparent 80%), radial-gradient(ellipse 42% 70% at 45% 0%, rgba(13, 148, 136, 0.24) 0%, transparent 75%)',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
        }}
      />

      {/* 2. Watchlist Ambient Sky-Blue Glow */}
      <div
        className={`pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-700 ease-in-out ${
          activeTab === 'watchlist' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.18),_transparent_65%)]" />
      </div>

      {/* 3. Watching Ambient Purple Glow */}
      <div
        className={`pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-700 ease-in-out ${
          activeTab === 'watching' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.18),_transparent_65%)]" />
      </div>

      {/* 4. Finished Ambient Emerald Glow */}
      <div
        className={`pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-700 ease-in-out ${
          activeTab === 'finished' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.18),_transparent_65%)]" />
      </div>

      {/* Global Ambient Artwork Canvas — ensures all frosted glass surfaces visibly refract real artwork */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none opacity-40">
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

      <ToastContainer />

      {/* Full-Width Solid Black Top Navbar Strip */}
      <TopNavbar
        onLogoClick={() => {
          handleTabChange('search')
        }}
        onNotificationsClick={() => setShowNotifications(true)}
        onLockClick={handleLock}
      />

      {/* Main content — keep all 4 tab containers mounted in DOM, with activation counter key for smooth glide */}
      <main className="relative z-10 bg-transparent pt-16">
        <div className={activeTab === 'search' ? 'block' : 'hidden'}>
          <SearchTab
            onOpenDrama={openDrama}
            onOpenPerson={openPerson}
            onTabChange={handleTabChange}
            discoverData={discoverData}
            onDiscoverLoaded={setDiscoverData}
          />
        </div>

        <div className={activeTab === 'watchlist' ? 'block' : 'hidden'}>
          <div key={`watchlist-glide-${tabSwitchCounts.watchlist}`} className="animate-tab-glide">
            <WatchlistTab onOpenDrama={openDrama} onOpenPerson={openPerson} />
          </div>
        </div>

        <div className={activeTab === 'watching' ? 'block' : 'hidden'}>
          <div key={`watching-glide-${tabSwitchCounts.watching}`} className="animate-tab-glide">
            <WatchingTab onOpenDrama={openDrama} onOpenPerson={openPerson} />
          </div>
        </div>

        <div className={activeTab === 'finished' ? 'block' : 'hidden'}>
          <div key={`finished-glide-${tabSwitchCounts.finished}`} className="animate-tab-glide">
            <FinishedTab onOpenDrama={openDrama} onOpenPerson={openPerson} />
          </div>
        </div>
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
