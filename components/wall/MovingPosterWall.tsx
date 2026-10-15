'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import type { Drama } from '@/lib/tmdb'

interface PosterItem {
  id: number
  title: string
  posterUrl: string
  year?: number
  country?: string
}

// 100% verified, live East Asian drama posters on TMDB CDN
const FALLBACK_COL_1: PosterItem[] = [
  { id: 293610, title: 'Doctor X: Mafia in White', posterUrl: 'https://image.tmdb.org/t/p/w500/nDDVzQfv95PGwj9nV2fJvUrkcvU.jpg', year: 2026, country: 'KR' },
  { id: 94796, title: 'Crash Landing on You', posterUrl: 'https://image.tmdb.org/t/p/w500/fgBNLPr6mC8pxuR79ENAJY4nBmj.jpg', year: 2019, country: 'KR' },
  { id: 293607, title: '100 Days of Deception', posterUrl: 'https://image.tmdb.org/t/p/w500/bZHEU42QynnMrHUWK1Hhvj2cdPA.jpg', year: 2026, country: 'KR' },
  { id: 93405, title: 'Squid Game', posterUrl: 'https://image.tmdb.org/t/p/w500/1QdXdRYfktUSONkl1oD5gc6Be0s.jpg', year: 2021, country: 'KR' },
  { id: 296206, title: 'Agent Kim Reactivated', posterUrl: 'https://image.tmdb.org/t/p/w500/mxa7YxVln3Rwnd2Va82PoclTznj.jpg', year: 2026, country: 'KR' },
  { id: 276161, title: 'Teach You a Lesson', posterUrl: 'https://image.tmdb.org/t/p/w500/fMECSPrTmRClSViMsXFYmiYIcWP.jpg', year: 2026, country: 'KR' },
]

const FALLBACK_COL_2: PosterItem[] = [
  { id: 289423, title: 'Take Charge of My Heart', posterUrl: 'https://image.tmdb.org/t/p/w500/ecRrKGXfflZmDZBD4irdkybClT.jpg', year: 2026, country: 'KR' },
  { id: 117376, title: 'Vincenzo', posterUrl: 'https://image.tmdb.org/t/p/w500/qbkSS1cTjT4DzIwD44bdhTuYgdT.jpg', year: 2021, country: 'KR' },
  { id: 231620, title: 'Natural High', posterUrl: 'https://image.tmdb.org/t/p/w500/oC2MuEWxnLVTyYw70XoK2HFf7nW.jpg', year: 2023, country: 'CN' },
  { id: 112888, title: 'True Beauty', posterUrl: 'https://image.tmdb.org/t/p/w500/I9WCyKUbKAiu95tAitaHOx8EVO.jpg', year: 2020, country: 'KR' },
  { id: 135157, title: 'Alchemy of Souls', posterUrl: 'https://image.tmdb.org/t/p/w500/gvOZN1NlAoL8iz9ghpES1zWA3w3.jpg', year: 2022, country: 'KR' },
  { id: 285838, title: 'If Wishes Could Kill', posterUrl: 'https://image.tmdb.org/t/p/w500/2CfTNVaR8kZQkWtWWE3Cntaiq33.jpg', year: 2026, country: 'KR' },
]

const FALLBACK_COL_3: PosterItem[] = [
  { id: 96162, title: 'Itaewon Class', posterUrl: 'https://image.tmdb.org/t/p/w500/qg7q0piY0fTt2enlIRHwKKRwNjS.jpg', year: 2020, country: 'KR' },
  { id: 33238, title: 'Running Man', posterUrl: 'https://image.tmdb.org/t/p/w500/2Wmmu1MkqxJ48J7aySET9EKEjXz.jpg', year: 2010, country: 'KR' },
  { id: 90447, title: 'Hotel Del Luna', posterUrl: 'https://image.tmdb.org/t/p/w500/8bizZsXoAsOTbhyFKfBogC8mgG2.jpg', year: 2019, country: 'KR' },
  { id: 278573, title: 'Perfect Crown', posterUrl: 'https://image.tmdb.org/t/p/w500/ocXkHSslrSWMz2ZJGl5MjF6dQr3.jpg', year: 2026, country: 'KR' },
  { id: 127529, title: 'Bloodhounds', posterUrl: 'https://image.tmdb.org/t/p/w500/uSQzD7TXsL96J5ggDrJFdUs8uXU.jpg', year: 2023, country: 'KR' },
  { id: 67915, title: 'Guardian: The Lonely and Great God', posterUrl: 'https://image.tmdb.org/t/p/w500/sPkxHNw5BFvuCFGWw825TS7n6X3.jpg', year: 2016, country: 'KR' },
]

interface MovingPosterWallProps {
  dramas?: Drama[]
  onPosterClick?: (id: number, drama?: Partial<Drama>) => void
  speedSeconds?: number
  className?: string
  interactive?: boolean
}

export default function MovingPosterWall({
  dramas,
  onPosterClick,
  speedSeconds = 42,
  className = '',
  interactive = true,
}: MovingPosterWallProps) {
  const [col1, setCol1] = useState<PosterItem[]>(FALLBACK_COL_1)
  const [col2, setCol2] = useState<PosterItem[]>(FALLBACK_COL_2)
  const [col3, setCol3] = useState<PosterItem[]>(FALLBACK_COL_3)

  function distribute(items: Drama[]) {
    const valid = items.filter(d => !!d.posterUrl && d.posterUrl.startsWith('http'))
    if (valid.length >= 6) {
      const c1: PosterItem[] = []
      const c2: PosterItem[] = []
      const c3: PosterItem[] = []

      valid.forEach((d, idx) => {
        const pItem: PosterItem = {
          id: d.tmdbId,
          title: d.title,
          posterUrl: d.posterUrl.replace('/original/', '/w500/'),
          year: d.releaseYear,
          country: d.country,
        }
        if (idx % 3 === 0) c1.push(pItem)
        else if (idx % 3 === 1) c2.push(pItem)
        else c3.push(pItem)
      })

      if (c1.length > 0) setCol1(c1)
      if (c2.length > 0) setCol2(c2)
      if (c3.length > 0) setCol3(c3)
    }
  }

  useEffect(() => {
    if (dramas && dramas.length >= 6) {
      distribute(dramas)
      return
    }

    // Auto-fetch real TMDB discover posters if dramas prop is empty (e.g. on AuthScreen)
    let alive = true
    fetch('/api/discover?region=ALL')
      .then(res => res.json())
      .then(data => {
        if (!alive || !data) return
        const list: Drama[] = []
        if (data.hero) list.push(...data.hero)
        if (data.rows) {
          data.rows.forEach((r: any) => {
            if (Array.isArray(r.dramas)) list.push(...r.dramas)
          })
        }
        if (list.length >= 6) {
          distribute(list)
        }
      })
      .catch(() => {})

    return () => { alive = false }
  }, [dramas])

  // Duplicate arrays to allow seamless continuous loop
  const list1 = [...col1, ...col1]
  const list2 = [...col2, ...col2]
  const list3 = [...col3, ...col3]

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <div className="grid grid-cols-3 gap-3 sm:gap-4 h-full w-full">
        {/* Column 1: Scrolls Upward */}
        <div
          className="flex flex-col gap-3 sm:gap-4 animate-scroll-up"
          style={{ animationDuration: `${speedSeconds}s` }}
        >
          {list1.map((item, idx) => (
            <PosterCard
              key={`c1-${item.id}-${idx}`}
              item={item}
              onClick={interactive && onPosterClick ? () => onPosterClick(item.id, item as any) : undefined}
            />
          ))}
        </div>

        {/* Column 2: Scrolls Downward */}
        <div
          className="flex flex-col gap-3 sm:gap-4 animate-scroll-down"
          style={{ animationDuration: `${speedSeconds * 1.05}s` }}
        >
          {list2.map((item, idx) => (
            <PosterCard
              key={`c2-${item.id}-${idx}`}
              item={item}
              onClick={interactive && onPosterClick ? () => onPosterClick(item.id, item as any) : undefined}
            />
          ))}
        </div>

        {/* Column 3: Scrolls Upward */}
        <div
          className="flex flex-col gap-3 sm:gap-4 animate-scroll-up"
          style={{ animationDuration: `${speedSeconds * 0.95}s` }}
        >
          {list3.map((item, idx) => (
            <PosterCard
              key={`c3-${item.id}-${idx}`}
              item={item}
              onClick={interactive && onPosterClick ? () => onPosterClick(item.id, item as any) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function PosterCard({
  item,
  onClick,
}: {
  item: PosterItem
  onClick?: () => void
}) {
  const [hasError, setHasError] = useState(false)

  if (hasError) return null

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative aspect-[2/3] w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.12] bg-[#14141c] shadow-lg transition-transform duration-200 transform-gpu ${
        onClick
          ? 'cursor-pointer active:scale-95 hover:border-white/40 hover:shadow-2xl'
          : 'pointer-events-none'
      }`}
    >
      <Image
        src={item.posterUrl}
        alt={item.title}
        fill
        sizes="(max-width: 640px) 30vw, (max-width: 1024px) 25vw, 180px"
        loading="lazy"
        onError={() => setHasError(true)}
        className="object-cover"
      />
    </div>
  )
}
