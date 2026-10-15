import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Drama Archive',
    short_name: 'Drama Archive',
    description: 'Track your K-Drama, J-Drama, and C-Drama watchlist beautifully',
    start_url: '/',
    display: 'standalone',
    background_color: '#08080e',
    theme_color: '#08080e',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
