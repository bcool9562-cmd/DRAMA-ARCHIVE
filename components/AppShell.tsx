'use client'

import { useState, useEffect } from 'react'
import AuthScreen from '@/components/auth/AuthScreen'
import BottomNav, { TabId } from '@/components/nav/BottomNav'
import SearchTab from '@/components/tabs/SearchTab'
import WatchlistTab from '@/components/tabs/WatchlistTab'
import WatchingTab from '@/components/tabs/WatchingTab'
import FinishedTab from '@/components/tabs/FinishedTab'
import NotificationSheet from '@/components/notifications/NotificationSheet'
import DramaDetailSheet from '@/components/drama/DramaDetailSheet'
import PersonProfileSheet from '@/components/person/PersonProfileSheet'
import ToastContainer from '@/components/Toast'

export default function AppShell() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('search')
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifDramaId, setNotifDramaId] = useState<number | null>(null)
  const [personId, setPersonId] = useState<number | null>(null)

  useEffect(() => {
    // Check persistent session cookie from server
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setIsUnlocked(!!data.unlocked)
        setAuthChecked(true)
      })
      .catch(() => {
        setIsUnlocked(false)
        setAuthChecked(true)
      })
  }, [])

  async function handleLock() {
    try {
      await fetch('/api/auth/lock', { method: 'POST' })
    } catch (e) {
      console.error('Lock error:', e)
    } finally {
      setIsUnlocked(false)
    }
  }

  // ── Loading splash ──────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-purple-500" />
      </div>
    )
  }

  // ── Lock Screen ─────────────────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <AuthScreen
        onAuthenticated={() => setIsUnlocked(true)}
      />
    )
  }

  // ── Authenticated App ───────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-black">
      <ToastContainer />
      {/* Safe-area top padding */}
      <main className="pt-[env(safe-area-inset-top,0px)]">
        {activeTab === 'search' && <SearchTab />}
        {activeTab === 'watchlist' && <WatchlistTab />}
        {activeTab === 'watching' && <WatchingTab />}
        {activeTab === 'finished' && <FinishedTab />}
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNotificationsClick={() => setShowNotifications(true)}
        onLockClick={handleLock}
      />

      {showNotifications && (
        <NotificationSheet
          onClose={() => setShowNotifications(false)}
          onDramaClick={(tmdbId) => {
            setShowNotifications(false)
            setNotifDramaId(tmdbId)
          }}
        />
      )}

      {notifDramaId && (
        <DramaDetailSheet
          tmdbId={notifDramaId}
          onClose={() => setNotifDramaId(null)}
          onPersonClick={(pId) => setPersonId(pId)}
        />
      )}

      {personId && (
        <PersonProfileSheet
          personId={personId}
          onClose={() => setPersonId(null)}
          onDramaClick={(dId) => {
            setPersonId(null)
            setNotifDramaId(dId)
          }}
        />
      )}
    </div>
  )
}
