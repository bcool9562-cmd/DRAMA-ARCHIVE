// Swiggy / Zomato-Style Witty Drama Notifications Generator for SCENOVA

export interface DramaNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: {
    url?: string
    tmdbId?: number
    type?: string
  }
}

export interface DramaContext {
  watchlist?: { title: string; tmdb_id?: number }[]
  watching?: { title: string; tmdb_id?: number; next_episode_number?: number }[]
  airingToday?: { title: string; tmdb_id?: number }[]
  upcoming?: { title: string; days: number; tmdb_id?: number }[]
}

export function generateWittyDramaNotification(context?: DramaContext): DramaNotificationPayload {
  const watchingList = context?.watching || []
  const watchlistList = context?.watchlist || []
  const airingList = context?.airingToday || []
  const upcomingList = context?.upcoming || []

  const sampleWatching = watchingList.length > 0
    ? watchingList[Math.floor(Math.random() * watchingList.length)]
    : { title: 'Queen of Tears', tmdb_id: 206586 }

  const sampleWatchlist = watchlistList.length > 0
    ? watchlistList[Math.floor(Math.random() * watchlistList.length)]
    : { title: 'Lovely Runner', tmdb_id: 226411 }

  const sampleAiring = airingList.length > 0
    ? airingList[0]
    : null

  const sampleUpcoming = upcomingList.length > 0
    ? upcomingList[0]
    : null

  const templates: DramaNotificationPayload[] = []

  // 1. Airing Today / Cliffhanger Alert
  if (sampleAiring) {
    templates.push({
      title: '🚨 Cliffhanger Alert!',
      body: `New ep of "${sampleAiring.title}" drops TODAY! Cancel your plans, fake a headache & grab snacks 🍿✨`,
      icon: '/icon-192.png',
      badge: '/icon.svg?v=pink3',
      tag: 'scenova-airing-today',
      data: { url: '/', tmdbId: sampleAiring.tmdb_id, type: 'airing' },
    })
  } else {
    templates.push({
      title: '🚨 Cliffhanger Alert!',
      body: `New ep of "${sampleWatching.title}" drops TODAY! Cancel your plans, fake a headache & grab snacks 🍿✨`,
      icon: '/icon-192.png',
      badge: '/icon.svg?v=pink3',
      tag: 'scenova-airing-today',
      data: { url: '/', tmdbId: sampleWatching.tmdb_id, type: 'airing' },
    })
  }

  // 2. Second-Lead Syndrome Alert (Watchlist)
  const count = Math.max(1, watchlistList.length || 7)
  templates.push({
    title: '💅 Second-Lead Syndrome Alert',
    body: `Your Watchlist has ${count} dramas staring at you like a sad second male lead. Give "${sampleWatchlist.title}" a chance tonight! 😭👉❤️`,
    icon: '/icon-192.png',
    badge: '/icon.svg?v=pink3',
    tag: 'scenova-watchlist-nudge',
    data: { url: '/', tmdbId: sampleWatchlist.tmdb_id, type: 'watchlist' },
  })

  // 3. 2 AM Binge Check (Watching)
  templates.push({
    title: '🌙 2 AM Binge Check',
    body: `'Just one more episode' — Famous last words. Ready to continue "${sampleWatching.title}"? 👀🔥`,
    icon: '/icon-192.png',
    badge: '/icon.svg?v=pink3',
    tag: 'scenova-watching-binge',
    data: { url: '/', tmdbId: sampleWatching.tmdb_id, type: 'watching' },
  })

  // 4. 4K Green Flags Waiting
  templates.push({
    title: '💚 4K Green Flags Waiting',
    body: `Real life has red flags, "${sampleWatchlist.title}" has 4K green flags waiting in Episode 1. Tap to binge! 🫶✨`,
    icon: '/icon-192.png',
    badge: '/icon.svg?v=pink3',
    tag: 'scenova-green-flags',
    data: { url: '/', tmdbId: sampleWatchlist.tmdb_id, type: 'green_flags' },
  })

  // 5. Premiere Countdown
  if (sampleUpcoming) {
    templates.push({
      title: '🍿 Premiere Countdown',
      body: `"${sampleUpcoming.title}" drops in ${sampleUpcoming.days} days! Emotionally prepare yourself for 16 episodes of chaos & romance 🎭💫`,
      icon: '/icon-192.png',
      badge: '/icon.svg?v=pink3',
      tag: 'scenova-premiere-countdown',
      data: { url: '/', tmdbId: sampleUpcoming.tmdb_id, type: 'upcoming' },
    })
  } else {
    templates.push({
      title: '🍿 Premiere Countdown',
      body: `"${sampleWatchlist.title}" drops soon! Emotionally prepare yourself for 16 episodes of chaos & romance 🎭💫`,
      icon: '/icon-192.png',
      badge: '/icon.svg?v=pink3',
      tag: 'scenova-premiere-countdown',
      data: { url: '/', tmdbId: sampleWatchlist.tmdb_id, type: 'upcoming' },
    })
  }

  // 6. Masterpiece Unlocked
  templates.push({
    title: '👑 Masterpiece Unlocked',
    body: 'Your sleep schedule is crying, but your SCENOVA Vibe Chart is thriving 📈💅',
    icon: '/icon-192.png',
    badge: '/icon.svg?v=pink3',
    tag: 'scenova-vibe-chart',
    data: { url: '/', type: 'vibe' },
  })

  // Pick random or prioritize context
  const chosen = templates[Math.floor(Math.random() * templates.length)]
  return chosen
}
