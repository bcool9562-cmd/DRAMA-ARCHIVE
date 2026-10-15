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

// Fallback high-res East Asian live-action drama posters
const FALLBACK_COL_1: PosterItem[] = [
  { id: 94796, title: 'Crash Landing on You', posterUrl: 'https://image.tmdb.org/t/p/w500/bvfu8r097a8ZzR8oP3a5U35w1yZ.jpg', year: 2019, country: 'KR' },
  { id: 213713, title: 'The Glory', posterUrl: 'https://image.tmdb.org/t/p/w500/6jO1e5vQvX64pW8oJk5V9V0T1yN.jpg', year: 2022, country: 'KR' },
  { id: 226411, title: 'Hidden Love', posterUrl: 'https://image.tmdb.org/t/p/w500/y6wA5zN0g5pBq2sD1e6a7e8e9.jpg', year: 2023, country: 'CN' },
  { id: 96162, title: 'Itaewon Class', posterUrl: 'https://image.tmdb.org/t/p/w500/8tVq8o0f1y5V8bZ8oP3a5U35w1yZ.jpg', year: 2020, country: 'KR' },
  { id: 204541, title: 'Love Between Fairy and Devil', posterUrl: 'https://image.tmdb.org/t/p/w500/5bZ8oP3a5U35w1yZ8tVq8o0f1y5.jpg', year: 2022, country: 'CN' },
  { id: 242876, title: 'Queen of Tears', posterUrl: 'https://image.tmdb.org/t/p/w500/p4gD6bL16k6685v2N1R8vXjKx4x.jpg', year: 2024, country: 'KR' },
]

const FALLBACK_COL_2: PosterItem[] = [
  { id: 67915, title: 'Goblin (Guardian)', posterUrl: 'https://image.tmdb.org/t/p/w500/c7d3L4M1V2a4k3p5n6q7r8s9t0.jpg', year: 2016, country: 'KR' },
  { id: 117376, title: 'Vincenzo', posterUrl: 'https://image.tmdb.org/t/p/w500/dvXJgEDQXqLq0f3L8V3a5U35w1y.jpg', year: 2021, country: 'KR' },
  { id: 210232, title: 'Till the End of the Moon', posterUrl: 'https://image.tmdb.org/t/p/w500/7O0Zl9qU0E9M3bT1P0X5jG1V2x.jpg', year: 2023, country: 'CN' },
  { id: 110356, title: 'First Love', posterUrl: 'https://image.tmdb.org/t/p/w500/4gD6bL16k6685v2N1R8vXjKx4x8.jpg', year: 2022, country: 'JP' },
  { id: 65942, title: 'Descendants of the Sun', posterUrl: 'https://image.tmdb.org/t/p/w500/9k8o0f1y5V8bZ8oP3a5U35w1yZ8.jpg', year: 2016, country: 'KR' },
  { id: 153496, title: 'Reset', posterUrl: 'https://image.tmdb.org/t/p/w500/3a5U35w1yZ8tVq8o0f1y5V8bZ8o.jpg', year: 2022, country: 'CN' },
]

const FALLBACK_COL_3: PosterItem[] = [
  { id: 114065, title: 'Mr. Queen', posterUrl: 'https://image.tmdb.org/t/p/w500/jL5v8o0f1y5V8bZ8oP3a5U35w1y.jpg', year: 2020, country: 'KR' },
  { id: 90447, title: 'Hotel Del Luna', posterUrl: 'https://image.tmdb.org/t/p/w500/8oP3a5U35w1yZ8tVq8o0f1y5V8b.jpg', year: 2019, country: 'KR' },
  { id: 95558, title: 'Joy of Life', posterUrl: 'https://image.tmdb.org/t/p/w500/1yZ8tVq8o0f1y5V8bZ8oP3a5U35.jpg', year: 2019, country: 'CN' },
  { id: 154824, title: 'A Business Proposal', posterUrl: 'https://image.tmdb.org/t/p/w500/5V8bZ8oP3a5U35w1yZ8tVq8o0f1.jpg', year: 2022, country: 'KR' },
  { id: 135157, title: 'Alchemy of Souls', posterUrl: 'https://image.tmdb.org/t/p/w500/8tVq8o0f1y5V8bZ8oP3a5U35w1.jpg', year: 2022, country: 'KR' },
  { id: 211089, title: 'Silent', posterUrl: 'https://image.tmdb.org/t/p/w500/2N1R8vXjKx4x8p4gD6bL16k6685.jpg', year: 2022, country: 'JP' },
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

  useEffect(() => {
    if (dramas && dramas.length >= 6) {
      const valid = dramas.filter(d => !!d.posterUrl && d.posterUrl.startsWith('http'))
      if (valid.length >= 6) {
        const c1: PosterItem[] = []
        const c2: PosterItem[] = []
        const c3: PosterItem[] = []

        valid.forEach((d, idx) => {
          const item: PosterItem = {
            id: d.tmdbId,
            title: d.title,
            posterUrl: d.posterUrl,
            year: d.releaseYear,
            country: d.country,
          }
          if (idx % 3 === 0) c1.push(item)
          else if (idx % 3 === 1) c2.push(item)
          else c3.push(item)
        })

        if (c1.length > 0) setCol1(c1)
        if (c2.length > 0) setCol2(c2)
        if (c3.length > 0) setCol3(c3)
      }
    }
  }, [dramas])

  // Duplicate arrays to allow seamless continuous loop
  const list1 = [...col1, ...col1]
  const list2 = [...col2, ...col2]
  const list3 = [...col3, ...col3]

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
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
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative aspect-[2/3] w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.14] bg-[#14141c] shadow-lg transition-transform duration-200 transform-gpu ${
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
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      {item.title && (
        <div className="absolute inset-x-2 bottom-2 text-left pointer-events-none">
          <p className="text-[10px] sm:text-xs font-bold text-white line-clamp-1 leading-tight drop-shadow-md">
            {item.title}
          </p>
        </div>
      )}
    </div>
  )
}
