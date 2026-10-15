'use client'

import React, { useState } from 'react'
import type { Drama } from '@/lib/tmdb'
import type { UserDrama } from '@/lib/supabase/archive'

export interface VibeItem {
  name: string
  pct: number
  color: string
}

export const MOCTALE_PALETTE = [
  '#c24816', // Burnt Orange
  '#0047ab', // Royal Cobalt Blue
  '#784b37', // Warm Espresso Brown
  '#c80815', // Crimson Red
  '#ff4069', // Vibrant Rose Pink
]

export const DEFAULT_VIBES: VibeItem[] = [
  { name: 'Romance', pct: 32, color: MOCTALE_PALETTE[0] },
  { name: 'Melodrama', pct: 24, color: MOCTALE_PALETTE[1] },
  { name: 'Thriller', pct: 20, color: MOCTALE_PALETTE[2] },
  { name: 'Youth', pct: 14, color: MOCTALE_PALETTE[3] },
  { name: 'Fantasy', pct: 10, color: MOCTALE_PALETTE[4] },
]

const VIBE_CATEGORIES = [
  { name: 'Romance', keywords: ['romance', 'love', 'romantic', 'couple', 'marriage', 'dating'] },
  { name: 'Melodrama', keywords: ['drama', 'melodrama', 'family', 'emotional', 'tragedy', 'tearjerker'] },
  { name: 'Thriller', keywords: ['thriller', 'crime', 'mystery', 'suspense', 'investigation', 'detective', 'murder'] },
  { name: 'Youth', keywords: ['youth', 'school', 'college', 'student', 'coming of age', 'friendship', 'teen'] },
  { name: 'Fantasy', keywords: ['fantasy', 'supernatural', 'magic', 'reincarnation', 'time travel', 'mythology'] },
  { name: 'Comedy', keywords: ['comedy', 'humor', 'sitcom', 'funny', 'hilarious'] },
  { name: 'Historical', keywords: ['historical', 'period', 'costume', 'dynasty', 'joseon', 'palace'] },
  { name: 'Action', keywords: ['action', 'martial arts', 'fighting', 'revenge', 'adventure'] },
]

/**
 * Calculates a dynamic 5-vibe distribution (totaling 100%) for a single drama.
 */
export function calculateDramaVibes(drama: Partial<Drama>): VibeItem[] {
  const scores: Record<string, number> = {}
  VIBE_CATEGORIES.forEach(v => { scores[v.name] = 10 })

  const textToScan = [
    drama.title || '',
    drama.synopsis || '',
    ...(drama.genres || []),
    ...(drama.tags || []),
  ].join(' ').toLowerCase()

  VIBE_CATEGORIES.forEach(v => {
    v.keywords.forEach(kw => {
      if (textToScan.includes(kw)) {
        scores[v.name] += 25
      }
    })
  })

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const totalScore = sorted.reduce((sum, item) => sum + item[1], 0)
  let allocated = 0

  const items: VibeItem[] = sorted.map(([name, score], idx) => {
    let pct = Math.round((score / totalScore) * 100)
    if (idx === 4) {
      pct = Math.max(5, 100 - allocated)
    } else {
      pct = Math.max(10, pct)
    }
    allocated += pct
    return {
      name,
      pct,
      color: MOCTALE_PALETTE[idx % MOCTALE_PALETTE.length],
    }
  })

  const sum = items.reduce((acc, it) => acc + it.pct, 0)
  if (sum !== 100) {
    items[0].pct += (100 - sum)
  }

  return items
}

/**
 * Calculates Subho's personal archive taste 5-vibe distribution from all saved dramas.
 */
export function calculateArchiveVibes(savedDramas: UserDrama[]): VibeItem[] {
  if (!savedDramas || savedDramas.length === 0) {
    return DEFAULT_VIBES
  }

  const scores: Record<string, number> = {
    Romance: 15,
    Melodrama: 12,
    Thriller: 10,
    Youth: 8,
    Fantasy: 8,
    Historical: 6,
    Comedy: 6,
    Action: 5,
  }

  savedDramas.forEach(d => {
    const titleAndCountry = `${d.title} ${d.native_title || ''}`.toLowerCase()
    VIBE_CATEGORIES.forEach(v => {
      v.keywords.forEach(kw => {
        if (titleAndCountry.includes(kw)) {
          scores[v.name] += 12
        }
      })
    })
  })

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const totalScore = sorted.reduce((sum, item) => sum + item[1], 0)
  let allocated = 0

  const items: VibeItem[] = sorted.map(([name, score], idx) => {
    let pct = Math.round((score / totalScore) * 100)
    if (idx === 4) {
      pct = Math.max(5, 100 - allocated)
    } else {
      pct = Math.max(10, pct)
    }
    allocated += pct
    return {
      name,
      pct,
      color: MOCTALE_PALETTE[idx % MOCTALE_PALETTE.length],
    }
  })

  const sum = items.reduce((acc, it) => acc + it.pct, 0)
  if (sum !== 100) {
    items[0].pct += (100 - sum)
  }

  return items
}

interface VibeChartProps {
  vibes?: VibeItem[]
  drama?: Partial<Drama>
  savedDramas?: UserDrama[]
  title?: string
  subtitle?: string
  onSelectVibe?: (vibeName: string) => void
  selectedVibe?: string | null
  className?: string
  borderless?: boolean
}

export default function VibeChart({
  vibes,
  drama,
  savedDramas,
  title = 'Vibe Chart',
  subtitle,
  onSelectVibe,
  selectedVibe,
  className = '',
  borderless = false,
}: VibeChartProps) {
  const chartVibes = React.useMemo(() => {
    if (vibes && vibes.length > 0) return vibes
    if (drama) return calculateDramaVibes(drama)
    if (savedDramas) return calculateArchiveVibes(savedDramas)
    return calculateArchiveVibes([])
  }, [vibes, drama, savedDramas])

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // Determine active item for center readout
  const activeIdx = hoveredIdx !== null
    ? hoveredIdx
    : (selectedVibe ? chartVibes.findIndex(v => v.name.toLowerCase() === selectedVibe.toLowerCase()) : 0)
  const activeItem = chartVibes[activeIdx >= 0 ? activeIdx : 0] || chartVibes[0]

  // Scaled SVG Donut geometry (w-48 h-48 = 192px)
  const size = 192
  const center = size / 2 // 96
  const radius = 66
  const strokeWidth = 20
  const circumference = 2 * Math.PI * radius // ~414.69
  const gap = 7

  let currentOffset = 0
  const segments = chartVibes.map((item, idx) => {
    const arcLength = (item.pct / 100) * circumference
    const strokeDash = Math.max(0, arcLength - gap)
    const strokeArray = `${strokeDash} ${circumference - strokeDash}`
    const strokeOffset = -currentOffset
    currentOffset += arcLength

    const isCurrent = (hoveredIdx === idx) || (selectedVibe && item.name.toLowerCase() === selectedVibe.toLowerCase())

    return {
      ...item,
      strokeArray,
      strokeOffset,
      isCurrent,
      idx,
    }
  })

  const containerClasses = borderless
    ? `w-full h-full flex flex-col justify-between ${className}`
    : `rounded-[28px] bg-[#101016]/85 backdrop-blur-2xl border border-white/[0.08] p-6 shadow-2xl transition-all duration-200 ${className}`

  return (
    <div className={containerClasses}>
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* Scaled Donut Ring (w-48 h-48) with Center Readout */}
      <div className="relative mx-auto my-1 flex items-center justify-center w-48 h-48">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full -rotate-90 transform-gpu"
        >
          {segments.map((seg) => (
            <circle
              key={seg.name}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={seg.isCurrent ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={seg.strokeArray}
              strokeDashoffset={seg.strokeOffset}
              strokeLinecap="round"
              className="transition-all duration-300 cursor-pointer"
              style={{
                opacity: (hoveredIdx !== null && hoveredIdx !== seg.idx) ? 0.45 : 1,
                filter: seg.isCurrent ? `drop-shadow(0 0 8px ${seg.color}88)` : undefined,
              }}
              onMouseEnter={() => setHoveredIdx(seg.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => {
                setHoveredIdx(seg.idx)
                onSelectVibe?.(seg.name)
              }}
            />
          ))}
        </svg>

        {/* Center Readout */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center select-none"
        >
          <span className="text-xs font-semibold tracking-tight text-white/90 drop-shadow-sm truncate max-w-[110px] px-2">
            {activeItem.name}
          </span>
          <span className="text-2xl font-black text-white tracking-tight drop-shadow-md mt-0.5">
            {activeItem.pct}%
          </span>
        </div>
      </div>

      {/* Legend List (Clean, compact rows to fit h-[460px] naturally) */}
      <div className="flex flex-col gap-1.5 mt-2">
        {chartVibes.map((item, idx) => {
          const isSelected = (hoveredIdx === idx) || (selectedVibe && item.name.toLowerCase() === selectedVibe.toLowerCase())
          return (
            <button
              key={item.name}
              type="button"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => {
                setHoveredIdx(idx)
                onSelectVibe?.(item.name)
              }}
              className={`flex items-center justify-between py-1.5 px-3 rounded-xl transition-all duration-150 cursor-pointer touch-manipulation select-none ${
                isSelected
                  ? 'bg-white/[0.12] border border-white/20 shadow-sm'
                  : 'hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm transition-transform duration-200"
                  style={{
                    backgroundColor: item.color,
                    transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: isSelected ? `0 0 8px ${item.color}` : undefined,
                  }}
                />
                <span className={`text-xs font-medium tracking-tight ${isSelected ? 'text-white font-bold' : 'text-white/80'}`}>
                  {item.name}
                </span>
              </div>
              <span className="text-xs font-bold text-white tabular-nums">
                {item.pct}%
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
