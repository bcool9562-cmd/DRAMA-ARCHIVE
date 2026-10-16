'use client'

import { useState, useEffect, useCallback } from 'react'
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

export default function AppShell() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('search')
  const [showNotifications, setShowNotifications] = useState(false)
  const [savedDramas, setSavedDramas] = useState<UserDrama[]>(() => getSavedDramasSync())
  const [discoverData, setDiscoverData] = useState<DiscoverData | null>(null)

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
      {/* Top-Left Purple-Teal Aurora Background Gradient (Photo 2 background, 100% visible) */}
      <div
        className="pointer-events-none absolute top-16 left-0 right-0 h-[480px] z-0"
        style={{
          background: 'radial-gradient(ellipse 48% 85% at 15% 0%, rgba(124, 58, 237, 0.48) 0%, rgba(91, 33, 182, 0.22) 50%, transparent 80%), radial-gradient(ellipse 40% 70% at 45% 0%, rgba(13, 148, 136, 0.22) 0%, transparent 75%)',
        }}
      />

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
          setActiveTab('search')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        onNotificationsClick={() => setShowNotifications(true)}
        onLockClick={handleLock}
      />

      {/* Main content — keep all tabs mounted to preserve scroll & animation state, zero black flash */}
      <main className="relative z-10 bg-transparent">
        <div
          className={`transition-all duration-250 ease-out ${
            activeTab === 'search'
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none invisible absolute inset-x-0 top-0'
          }`}
        >
          <SearchTab
            onOpenDrama={openDrama}
            onOpenPerson={openPerson}
            onTabChange={setActiveTab}
            discoverData={discoverData}
            onDiscoverLoaded={setDiscoverData}
          />
        </div>

        <div
          className={`transition-all duration-250 ease-out ${
            activeTab === 'watchlist'
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none invisible absolute inset-x-0 top-0'
          }`}
        >
          <WatchlistTab onOpenDrama={openDrama} onOpenPerson={openPerson} />
        </div>

        <div
          className={`transition-all duration-250 ease-out ${
            activeTab === 'watching'
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none invisible absolute inset-x-0 top-0'
          }`}
        >
          <WatchingTab onOpenDrama={openDrama} onOpenPerson={openPerson} />
        </div>

        <div
          className={`transition-all duration-250 ease-out ${
            activeTab === 'finished'
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none invisible absolute inset-x-0 top-0'
          }`}
        >
          <FinishedTab onOpenDrama={openDrama} onOpenPerson={openPerson} />
        </div>
      </main>

      {/* Bottom dock — hidden when modal is open to prevent GPU compositing */}
      {!modalOpen && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
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
