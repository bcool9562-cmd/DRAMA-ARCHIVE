// Client-side Web Push & Service Worker Helper

import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from './vapidKeys'
import { getSavedDramasSync } from './supabase/archive'

export async function getSWRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  try {
    let reg = await navigator.serviceWorker.getRegistration()
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js')
    }
    await navigator.serviceWorker.ready
    return reg
  } catch (err) {
    console.error('[getSWRegistration error]:', err)
    return null
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return false
    if (Notification.permission !== 'granted') return false

    const storedSetting = localStorage.getItem('scenova_alerts_enabled')
    if (storedSetting === 'false') return false

    const reg = await getSWRegistration()
    if (!reg) return false

    const sub = await reg.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}

export async function subscribeToPush(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return false
    }

    // Request permission if not yet granted
    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    if (permission !== 'granted') {
      return false
    }

    const reg = await getSWRegistration()
    if (!reg) return false

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      })
    }

    // Register periodicSync if supported on Android
    try {
      if ('periodicSync' in reg) {
        // @ts-ignore
        await reg.periodicSync.register('scenova-daily-check', {
          minInterval: 12 * 60 * 60 * 1000, // 12 hours
        })
      }
    } catch {
      // ignore
    }

    // Get current drama titles for witty notifications
    const dramas = getSavedDramasSync()
    const dramaTitles = dramas.map((d) => d.title)

    // Send subscription to backend
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        dramaTitles,
      }),
    })

    if (res.ok) {
      localStorage.setItem('scenova_alerts_enabled', 'true')
      return true
    }
    return false
  } catch (err) {
    console.error('[subscribeToPush error]:', err)
    return false
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    localStorage.setItem('scenova_alerts_enabled', 'false')

    const reg = await getSWRegistration()
    if (reg) {
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {})
      }
    }
    return true
  } catch (err) {
    console.error('[unsubscribeFromPush error]:', err)
    return false
  }
}

/**
 * Automatically syncs push subscription on app load if user previously granted permission
 */
export async function autoSyncPushSubscription(): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const storedSetting = localStorage.getItem('scenova_alerts_enabled')
  if (storedSetting === 'false') return // Explicitly turned OFF by user

  // User has permission and hasn't toggled off -> auto sync in background
  await subscribeToPush()
}
