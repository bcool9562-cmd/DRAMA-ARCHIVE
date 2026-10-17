import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Unbounded } from 'next/font/google'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

const unbounded = Unbounded({
  variable: '--font-unbounded',
  subsets: ['latin'],
  weight: ['800', '900'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SCENOVA',
  description: 'Track your K-Drama, J-Drama, and C-Drama watchlist beautifully',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg?v=pink3', type: 'image/svg+xml' },
      { url: '/icon?v=pink3', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon?v=pink3', sizes: '180x180', type: 'image/png' },
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
        <link rel="icon" type="image/svg+xml" href="/icon.svg?v=pink3" />
        <link rel="icon" sizes="512x512" type="image/png" href="/icon?v=pink3" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon?v=pink3" />
      </head>
      <body
        suppressHydrationWarning
        className={`${plusJakartaSans.className} ${plusJakartaSans.variable} ${unbounded.variable} font-sans antialiased min-h-screen bg-[#050507] text-white selection:bg-pink-500/30 selection:text-white`}
      >
        {children}
      </body>
    </html>
  )
}
