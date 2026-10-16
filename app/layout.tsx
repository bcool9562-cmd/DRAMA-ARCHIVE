import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Unbounded } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const unbounded = Unbounded({
  variable: '--font-unbounded',
  subsets: ['latin'],
  weight: ['800', '900'],
})

export const metadata: Metadata = {
  title: 'SCENOVA',
  description: 'Track your K-Drama, J-Drama, and C-Drama watchlist beautifully',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg?v=pink2', type: 'image/svg+xml' },
      { url: '/icon?v=pink2', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon?v=pink2', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SCENOVA',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#050507',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg?v=pink2" />
        <link rel="icon" sizes="512x512" type="image/png" href="/icon?v=pink2" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon?v=pink2" />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable} antialiased min-h-screen bg-[#050507] text-white`}
      >
        {children}
      </body>
    </html>
  )
}
