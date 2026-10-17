// SCENOVA Background Service Worker (Web Push & Periodic Airing Sync)

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Handle real background Web Push (Wakes up Android/iOS even when app is closed)
self.addEventListener('push', (event) => {
  let data = {
    title: '🚨 Cliffhanger Alert!',
    body: 'New drama episode drops TODAY! Cancel your plans & grab snacks 🍿✨',
    icon: '/icon?v=pink3',
    badge: '/icon?v=pink3',
    tag: 'scenova-drama-push',
    data: { url: '/' },
  }

  try {
    if (event.data) {
      const parsed = event.data.json()
      data = { ...data, ...parsed }
    }
  } catch {
    if (event.data) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon?v=pink3',
    badge: data.badge || '/icon?v=pink3',
    vibrate: [200, 100, 200],
    tag: data.tag || 'scenova-alert',
    renotify: true,
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Watch Now 🍿' },
      { action: 'dismiss', title: 'Later' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle Periodic Sync & Background Sync (wakes up when mobile data is reconnected)
self.addEventListener('sync', (event) => {
  if (event.tag === 'scenova-airing-sync') {
    event.waitUntil(
      fetch('/api/push/send?trigger=sync').catch(() => {})
    )
  }
})

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'scenova-daily-check') {
    event.waitUntil(
      fetch('/api/push/send?trigger=periodicsync').catch(() => {})
    )
  }
})

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
