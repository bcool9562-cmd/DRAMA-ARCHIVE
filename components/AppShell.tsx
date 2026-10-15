'use client'

import { useState, useEffect, useCallback } from 'react'
import AuthScreen from '@/components/auth/AuthScreen'
import BottomNav, { TabId } from '@/components/nav/BottomNav'
import SearchTab from '@/components/tabs/SearchTab'
import WatchlistTab from '@/components/tabs/WatchlistTab'
import WatchingTab from '@/components/tabs/WatchingTab'
import FinishedTab from '@/components/tabs/FinishedTab'
import NotificationSheet from '@/components/notifications/NotificationSheet'
import NavStackModal, { type StackItem } from '@/components/nav/NavStackModal'
import ToastContainer from '@/components/Toast'

export default function AppShell() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('search')
  const [showNotifications, setShowNotifications] = useState(false)

  // Unified navigation stack — shared across all tabs
  const [navStack, setNavStack] = useState<StackItem[]>([])
  const [navDepth, setNavDepth] = useState(0)

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
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-purple-500" />
      </div>
    )
  }

  if (!isUnlocked) {
    return <AuthScreen onAuthenticated={() => setIsUnlocked(true)} />
  }

  const modalOpen = navDepth > 0

  return (
    <div className={`relative min-h-screen bg-black ${modalOpen ? 'overflow-hidden' : ''}`}>
      <ToastContainer />

      {/* Main content — blur & lock scroll when modal is open */}
      <main className="pt-[env(safe-area-inset-top,0px)]">
        {activeTab === 'search' && (
          <SearchTab
            onOpenDrama={openDrama}
            onOpenPerson={openPerson}
            onTabChange={setActiveTab}
          />
        )}
        {activeTab === 'watchlist' && <WatchlistTab onOpenDrama={openDrama} onOpenPerson={openPerson} />}
        {activeTab === 'watching' && <WatchingTab onOpenDrama={openDrama} onOpenPerson={openPerson} />}
        {activeTab === 'finished' && <FinishedTab onOpenDrama={openDrama} onOpenPerson={openPerson} />}
      </main>

      {/* Bottom dock — hidden when modal is open to prevent GPU compositing */}
      {!modalOpen && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNotificationsClick={() => setShowNotifications(true)}
          onLockClick={handleLock}
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
