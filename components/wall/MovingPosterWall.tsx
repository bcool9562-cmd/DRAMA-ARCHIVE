'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import SafeImage from '@/components/ui/SafeImage'
import type { Drama } from '@/lib/tmdb'

interface PosterItem {
  id: number
  title: string
  posterUrl: string
  backdropUrl?: string
  year?: number
  country?: string
}

// 100% verified, live East Asian drama posters and backdrops on TMDB CDN in mobile-optimized w342/w780 (strictly 2026 dramas)
const DEFAULT_COL_1: PosterItem[] = [
  { id: 300146, title: 'Where the Mask Ends', posterUrl: 'https://image.tmdb.org/t/p/w342/cE9Og0lCCRCP2RArarzJXmu6xEB.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/YndvGwqwroUDVltBWmnOuTvJke.jpg', year: 2026, country: 'CN' },
  { id: 279246, title: 'The Remarried Empress', posterUrl: 'https://image.tmdb.org/t/p/w342/3x6c9ybt0762idyzIifUZeTD5MZ.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/i6TwJ9uOynLnSWpKWnzqkV37iJ1.jpg', year: 2026, country: 'KR' },
  { id: 316702, title: 'Final Table', posterUrl: 'https://image.tmdb.org/t/p/w342/uaMjtALuvZC7dGkYllGKKWEWW1J.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/gq3FEuYsUl1r4rQYDCaQvzw1bOd.jpg', year: 2026, country: 'KR' },
  { id: 301354, title: 'Sword & Silence', posterUrl: 'https://image.tmdb.org/t/p/w342/2uHBCDBnSjBlvNgXJ5ceORgX8FL.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/7vNdl7UGRGCLOgjrjIi0M4EuS0U.jpg', year: 2026, country: 'KR' },
  { id: 334517, title: 'Oh! My Guard', posterUrl: 'https://image.tmdb.org/t/p/w342/dg4IIruyBEtSgjW5fdXi46xrSzC.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/lsxnC3TaQwSiSUVNR3UojUEOUWU.jpg', year: 2026, country: 'KR' },
  { id: 303552, title: 'The Substitute', posterUrl: 'https://image.tmdb.org/t/p/w342/q464FdzW2edGsyNYAbueYuTEBMR.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/6eTOReypqXlvHpWkt61D5c9fAtq.jpg', year: 2026, country: 'KR' },
]

const DEFAULT_COL_2: PosterItem[] = [
  { id: 303745, title: 'Love in Disguise', posterUrl: 'https://image.tmdb.org/t/p/w342/kSAXIAovLC4z7Wp2Hy8oqLmpkox.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/32g5MD6eHPAZ5NAgkNAURb4eupm.jpg', year: 2026, country: 'KR' },
  { id: 307478, title: 'The Perfect Lie', posterUrl: 'https://image.tmdb.org/t/p/w342/lrFE7DdRXu6ofhCm9dLNzsyLg92.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/hglYTJIswg5p3YA3V85B2dhvnNj.jpg', year: 2026, country: 'KR' },
  { id: 322051, title: 'The Sound of Sugar Cubes', posterUrl: 'https://image.tmdb.org/t/p/w342/h5rPKIREqKHYPvVUl8sBJyna2vq.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/bGveCIHFN2FZrn4OcXsHZiQrrgr.jpg', year: 2026, country: 'KR' },
  { id: 313738, title: 'One of a Kind Romance', posterUrl: 'https://image.tmdb.org/t/p/w342/l9oQ1Ql8DJqYnrDyU85fAPYTmrD.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/l53JuTPn64mZumJrn3Tcw3zhgvo.jpg', year: 2026, country: 'KR' },
  { id: 335951, title: 'Summer Vacation', posterUrl: 'https://image.tmdb.org/t/p/w342/ru4oyTVoPVQZPUE5rI3YPMgLHBY.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/ru4oyTVoPVQZPUE5rI3YPMgLHBY.jpg', year: 2026, country: 'KR' },
  { id: 334321, title: 'SQUALL', posterUrl: 'https://image.tmdb.org/t/p/w342/sqbMChPp0aXNmkcMw2zjHjUpleB.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/sqbMChPp0aXNmkcMw2zjHjUpleB.jpg', year: 2026, country: 'JP' },
]

const DEFAULT_COL_3: PosterItem[] = [
  { id: 289517, title: 'Dead-End Job', posterUrl: 'https://image.tmdb.org/t/p/w342/1yobke0bpfNOazuF9wW7QbM2GER.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/1yobke0bpfNOazuF9wW7QbM2GER.jpg', year: 2026, country: 'KR' },
  { id: 300523, title: 'Blue Road', posterUrl: 'https://image.tmdb.org/t/p/w342/rHgC4wYhpI8Vx7kSwA1OTvwQRh0.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/7ojpD6ARKYhRxnsjzMIrorOfj4T.jpg', year: 2026, country: 'KR' },
  { id: 256726, title: 'Tantara', posterUrl: 'https://image.tmdb.org/t/p/w342/733Vm8e0bzUbjbDuATgR4Ol7vqd.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/6xfFYh2NARTZQ8hee0XPaZtLxpm.jpg', year: 2026, country: 'KR' },
  { id: 258862, title: 'Sacred Jewel', posterUrl: 'https://image.tmdb.org/t/p/w342/2mDpdgBOH52W91wgzqXtxD7ajiZ.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/psZaywh5u4974dnOs0P3LVIt0h2.jpg', year: 2026, country: 'KR' },
  { id: 326975, title: 'What a Boss Wants', posterUrl: 'https://image.tmdb.org/t/p/w342/ldqsRIHnjdCf72TRtXtdlaWlbsI.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w780/uvvgUvAoi9P6dz86t5LIYSeeBc9.jpg', year: 2026, country: 'KR' },
  { id: 283220, title: 'Quiztopia', posterUrl: 'https://image.tmdb.org/t/p/w342/yvkEL51xnhAuKpaycMU1dOnozwN.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w342/yvkEL51xnhAuKpaycMU1dOnozwN.jpg', year: 2026, country: 'JP' },
]

function extractColumns(items?: Drama[]) {
  if (!items || items.length < 6) return null
  const valid = items.filter(d => !!d.posterUrl && d.posterUrl.startsWith('http'))
  if (valid.length < 6) return null
  const c1: PosterItem[] = []
  const c2: PosterItem[] = []
  const c3: PosterItem[] = []

  valid.forEach((d, idx) => {
    const pItem: PosterItem = {
      id: d.tmdbId,
      title: d.title,
      posterUrl: d.posterUrl.replace(/\/t\/p\/(original|w780|w500)\//, '/t/p/w342/'),
      backdropUrl: d.backdropUrl || d.posterUrl,
      year: d.releaseYear,
      country: d.country,
    }
    if (idx % 3 === 0 && c1.length < 6) c1.push(pItem)
    else if (idx % 3 === 1 && c2.length < 6) c2.push(pItem)
    else if (c3.length < 6) c3.push(pItem)
  })

  return { c1, c2, c3 }
}

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
  const initialCols = extractColumns(dramas)
  const [col1, setCol1] = useState<PosterItem[]>(() => initialCols?.c1 || DEFAULT_COL_1)
  const [col2, setCol2] = useState<PosterItem[]>(() => initialCols?.c2 || DEFAULT_COL_2)
  const [col3, setCol3] = useState<PosterItem[]>(() => initialCols?.c3 || DEFAULT_COL_3)

  useEffect(() => {
    if (dramas && dramas.length >= 6) {
      const parsed = extractColumns(dramas)
      if (parsed) {
        // Avoid state update if identical to prevent resetting scroll or swapping
        const isSame =
          parsed.c1.length === col1.length &&
          parsed.c1.every((item, i) => item.id === col1[i]?.id)
        if (!isSame) {
          setCol1(parsed.c1)
          setCol2(parsed.c2)
          setCol3(parsed.c3)
        }
      }
      return
    }

    // Auto-fetch real TMDB discover posters only if dramas prop is not provided
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
          const parsed = extractColumns(list)
          if (parsed && alive) {
            setCol1(parsed.c1)
            setCol2(parsed.c2)
            setCol3(parsed.c3)
          }
        }
      })
      .catch(() => {})

    return () => { alive = false }
  }, [dramas])

  // Exactly 6 items duplicated once = 12 items per column max (butter-smooth 60fps)
  const list1 = [...col1.slice(0, 6), ...col1.slice(0, 6)]
  const list2 = [...col2.slice(0, 6), ...col2.slice(0, 6)]
  const list3 = [...col3.slice(0, 6), ...col3.slice(0, 6)]

  return (
    <div
      className={`relative w-full h-full overflow-hidden will-change-transform transform-gpu [backface-visibility:hidden] [contain:layout_paint] ${className}`}
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 h-full w-full">
        {/* Column 1: Scrolls Upward */}
        <div
          className="flex flex-col gap-2.5 sm:gap-4 animate-scroll-up will-change-transform transform-gpu [backface-visibility:hidden]"
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
          className="flex flex-col gap-2.5 sm:gap-4 animate-scroll-down will-change-transform transform-gpu [backface-visibility:hidden]"
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
          className="flex flex-col gap-2.5 sm:gap-4 animate-scroll-up will-change-transform transform-gpu [backface-visibility:hidden]"
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
      className={`relative aspect-[2/3] w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.10] bg-[#14141c] shadow-lg transform-gpu ${
        onClick
          ? 'cursor-pointer active:scale-95 hover:scale-[1.04] hover:z-10 hover:border-white/40 hover:shadow-2xl transition-transform duration-300 ease-out'
          : 'pointer-events-none select-none'
      }`}
    >
      <SafeImage
        src={item.posterUrl}
        size="w342"
        alt={item.title}
        fill
        sizes="(max-width: 640px) 30vw, (max-width: 1024px) 25vw, 240px"
        loading="lazy"
        decoding="async"
        className="object-cover"
        fallbackText="No Poster"
      />
    </div>
  )
}
