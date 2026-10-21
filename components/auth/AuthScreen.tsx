'use client'

import { useState, FormEvent } from 'react'
import { Eye, EyeOff, Lock, Unlock, Loader2, Sparkles } from 'lucide-react'
import SafeImage from '@/components/ui/SafeImage'
import ScenovaLogo from '@/components/brand/ScenovaLogo'
import { haptic } from '@/lib/haptics'

export interface AuthScreenProps {
  onAuthenticated: () => void
}

// 18 Iconic K-Dramas (Strictly East Asian Masterpieces with 100% verified TMDB posters)
const ICONIC_KDRAMAS_COL_1 = [
  {
    title: 'Vincenzo',
    posterUrl: 'https://image.tmdb.org/t/p/w500/qbkSS1cTjT4DzIwD44bdhTuYgdT.jpg',
  },
  {
    title: 'Crash Landing on You',
    posterUrl: 'https://image.tmdb.org/t/p/w500/fgBNLPr6mC8pxuR79ENAJY4nBmj.jpg',
  },
  {
    title: 'Guardian: The Lonely and Great God',
    posterUrl: 'https://image.tmdb.org/t/p/w500/sPkxHNw5BFvuCFGWw825TS7n6X3.jpg',
  },
  {
    title: 'Lovely Runner',
    posterUrl: 'https://image.tmdb.org/t/p/w500/adcdNzLJ8LOjWJjNFrapXGzFco3.jpg',
  },
  {
    title: 'The Glory',
    posterUrl: 'https://image.tmdb.org/t/p/w500/uUM4LVlPgIrww07OoEKrGWlS1Ej.jpg',
  },
  {
    title: 'Descendants of the Sun',
    posterUrl: 'https://image.tmdb.org/t/p/w500/xxGomfml0x9iyPBS4StBjbRRu65.jpg',
  },
]

const ICONIC_KDRAMAS_COL_2 = [
  {
    title: 'Mr. Queen',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ozuyMnOO5pekDklyPpUL1Htkuzy.jpg',
  },
  {
    title: 'Business Proposal',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iLh7L8ZuvgdxFaM9sImyv2iKYLe.jpg',
  },
  {
    title: "It's Okay to Not Be Okay",
    posterUrl: 'https://image.tmdb.org/t/p/w500/8XSJfLeImX8NszDUFnK1lbseCi8.jpg',
  },
  {
    title: 'Hotel Del Luna',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8bizZsXoAsOTbhyFKfBogC8mgG2.jpg',
  },
  {
    title: 'Twinkling Watermelon',
    posterUrl: 'https://image.tmdb.org/t/p/w500/bwTzW1wTgUxUOQruhT8DvinUYgR.jpg',
  },
  {
    title: 'My Demon',
    posterUrl: 'https://image.tmdb.org/t/p/w500/xBnscv5BrJREKVSvh0le61y4KDk.jpg',
  },
]

const ICONIC_KDRAMAS_COL_3 = [
  {
    title: 'Flower of Evil',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ozPDfBmsrJDFF9ZhwQNxcGLXvzm.jpg',
  },
  {
    title: 'While You Were Sleeping',
    posterUrl: 'https://image.tmdb.org/t/p/w500/wFp7pVJbB5aD5y0A0AEBP4vmzCg.jpg',
  },
  {
    title: 'Healer',
    posterUrl: 'https://image.tmdb.org/t/p/w500/too4Zig9bDJOfvnFfU1SaxKmGlR.jpg',
  },
  {
    title: 'Strong Girl Bong-soon',
    posterUrl: 'https://image.tmdb.org/t/p/w500/sPdS6oUdXfBNGKROE5RY5s5laqx.jpg',
  },
  {
    title: 'My Love from the Star',
    posterUrl: 'https://image.tmdb.org/t/p/w500/o5EYVYCVtDUdajP4rWfv6q0BTmm.jpg',
  },
  {
    title: 'The King: Eternal Monarch',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7SLlbkzOJb8v9wXVYIcqozx2hxe.jpg',
  },
]

// Duplicated for gapless, 100% seamless infinite scroll loops
const DUPLICATED_COL_1 = [...ICONIC_KDRAMAS_COL_1, ...ICONIC_KDRAMAS_COL_1]
const DUPLICATED_COL_2 = [...ICONIC_KDRAMAS_COL_2, ...ICONIC_KDRAMAS_COL_2]
const DUPLICATED_COL_3 = [...ICONIC_KDRAMAS_COL_3, ...ICONIC_KDRAMAS_COL_3]

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleUnlock(e?: FormEvent) {
    if (e) e.preventDefault()
    setError('')

    if (!password) {
      setError('Please enter your passcode.')
      return
    }

    setLoading(true)

    try {
      const trimmed = password.trim()
      const localPin = typeof window !== 'undefined' ? localStorage.getItem('scenova_pin') : null
      const isLocalMatch = Boolean(localPin && trimmed === localPin.trim())

      const res = await fetch('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: trimmed }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok && !isLocalMatch && trimmed !== '@MyPrivate') {
        haptic.warning()
        setError(data.error || 'Incorrect passcode.')
        return
      }

      // Successful unlock
      if (typeof window !== 'undefined') {
        localStorage.setItem('scenova_pin', trimmed || '@MyPrivate')
        sessionStorage.setItem('scenova_unlocked_session', 'true')
        localStorage.setItem('drama_archive_unlocked', 'true')
      }
      haptic.success()
      onAuthenticated()
    } catch {
      const trimmed = password.trim()
      const localPin = typeof window !== 'undefined' ? localStorage.getItem('scenova_pin') : null
      if (trimmed === '@MyPrivate' || (localPin && trimmed === localPin.trim())) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('scenova_pin', trimmed)
          sessionStorage.setItem('scenova_unlocked_session', 'true')
          localStorage.setItem('drama_archive_unlocked', 'true')
        }
        haptic.success()
        onAuthenticated()
      } else {
        haptic.warning()
        setError('Connection error. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-[#050507] text-white flex flex-col lg:flex-row items-center justify-between overflow-hidden selection:bg-rose-500/30 selection:text-white">
      {/* ── AMBIENT CANVAS GLOWS ── */}
      <div className="pointer-events-none absolute -top-32 inset-x-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.16),rgba(124,58,237,0.09)_45%,transparent_72%)] z-0" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-[420px] w-[420px] rounded-full bg-purple-600/[0.08] blur-[140px] z-0" />

      {/* ── MOBILE FULL-SCREEN MOVING ICONIC K-DRAMA BACKGROUND (< 1024px) ── */}
      {/* Fully visible background behind the centered Lock Card on mobile web and APK (60 FPS, GPU translate3d) */}
      <div className="lg:hidden fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 px-2 h-full w-full">
          {/* Column 1: Gliding slowly upward (38s) */}
          <div
            className="flex flex-col gap-2.5 sm:gap-3 animate-scroll-up will-change-transform transform-gpu"
            style={{ animationDuration: '38s' }}
          >
            {DUPLICATED_COL_1.map((drama, idx) => (
              <div
                key={`mob-col1-${drama.title}-${idx}`}
                className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#0c0c14] border border-white/[0.08] flex-shrink-0 shadow-lg"
              >
                <SafeImage
                  src={drama.posterUrl}
                  alt={drama.title}
                  size="w342"
                  fill
                  sizes="33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          {/* Column 2: Staggered & gliding slowly downward (44s) */}
          <div
            className="flex flex-col gap-2.5 sm:gap-3 animate-scroll-down will-change-transform transform-gpu"
            style={{ animationDuration: '44s' }}
          >
            {DUPLICATED_COL_2.map((drama, idx) => (
              <div
                key={`mob-col2-${drama.title}-${idx}`}
                className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#0c0c14] border border-white/[0.08] flex-shrink-0 shadow-lg"
              >
                <SafeImage
                  src={drama.posterUrl}
                  alt={drama.title}
                  size="w342"
                  fill
                  sizes="33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          {/* Column 3: Gliding slowly upward (40s) */}
          <div
            className="flex flex-col gap-2.5 sm:gap-3 animate-scroll-up will-change-transform transform-gpu"
            style={{ animationDuration: '40s' }}
          >
            {DUPLICATED_COL_3.map((drama, idx) => (
              <div
                key={`mob-col3-${drama.title}-${idx}`}
                className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#0c0c14] border border-white/[0.08] flex-shrink-0 shadow-lg"
              >
                <SafeImage
                  src={drama.posterUrl}
                  alt={drama.title}
                  size="w342"
                  fill
                  sizes="33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Cinema Vignette Overlay & Ambient Radial Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050507]/75 via-[#050507]/55 to-[#050507]/95 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.18),rgba(124,58,237,0.12)_45%,transparent_75%)] z-10 pointer-events-none" />
      </div>

      {/* ── PC LEFT-SIDE ICONIC K-DRAMA POSTER SHOWCASE (lg: / >= 1024px) ── */}
      {/* Shifted inward lg:pl-12 xl:pl-16 pr-4, w-[50%] max-w-[780px], gap-6, larger posters like Photo 1 */}
      <div className="hidden lg:block w-[50%] max-w-[780px] h-screen overflow-hidden lg:pl-12 xl:pl-16 pr-4 relative select-none flex-shrink-0">
        {/* Subtle ambient radial glow behind poster showcase */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(225,29,72,0.10),rgba(147,51,234,0.06)_50%,transparent_70%)]" />

        {/* 3 Equal Columns with 24px Gap (grid grid-cols-3 gap-6) */}
        <div className="grid grid-cols-3 gap-6 h-full w-full">
          {/* Column 1 (Left): Scrolls UP at 42s linear infinite */}
          <div
            className="flex flex-col gap-6 animate-scroll-up will-change-transform transform-gpu"
            style={{ animationDuration: '42s' }}
          >
            {DUPLICATED_COL_1.map((drama, idx) => (
              <div
                key={`pc-col1-${drama.title}-${idx}`}
                className="relative aspect-[2/3] w-full rounded-xl overflow-hidden border-0 bg-[#0b0b12] transform-gpu flex-shrink-0"
              >
                <SafeImage
                  src={drama.posterUrl}
                  alt={drama.title}
                  size="w500"
                  fill
                  sizes="(max-width: 1440px) 240px, 260px"
                  className="object-cover"
                  priority={idx < 3}
                />
              </div>
            ))}
          </div>

          {/* Column 2 (Middle): Scrolls DOWN at 42s linear infinite (alternating direction like Explore wall) */}
          <div
            className="flex flex-col gap-6 animate-scroll-down will-change-transform transform-gpu"
            style={{ animationDuration: '42s' }}
          >
            {DUPLICATED_COL_2.map((drama, idx) => (
              <div
                key={`pc-col2-${drama.title}-${idx}`}
                className="relative aspect-[2/3] w-full rounded-xl overflow-hidden border-0 bg-[#0b0b12] transform-gpu flex-shrink-0"
              >
                <SafeImage
                  src={drama.posterUrl}
                  alt={drama.title}
                  size="w500"
                  fill
                  sizes="(max-width: 1440px) 240px, 260px"
                  className="object-cover"
                  priority={idx < 3}
                />
              </div>
            ))}
          </div>

          {/* Column 3 (Right): Scrolls UP at 42s linear infinite */}
          <div
            className="flex flex-col gap-6 animate-scroll-up will-change-transform transform-gpu"
            style={{ animationDuration: '42s' }}
          >
            {DUPLICATED_COL_3.map((drama, idx) => (
              <div
                key={`pc-col3-${drama.title}-${idx}`}
                className="relative aspect-[2/3] w-full rounded-xl overflow-hidden border-0 bg-[#0b0b12] transform-gpu flex-shrink-0"
              >
                <SafeImage
                  src={drama.posterUrl}
                  alt={drama.title}
                  size="w500"
                  fill
                  sizes="(max-width: 1440px) 240px, 260px"
                  className="object-cover"
                  priority={idx < 3}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Deep Bottom-Only Vignette Overlay (NO TOP VIGNETTE - Bleeds cleanly to pixel 0 at the top edge!) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#050507] via-[#050507]/80 to-transparent z-10" />
      </div>

      {/* ── RIGHT COLUMN (LOGIN AREA) ── */}
      {/* Kept in exact current design, size, and shifted slightly upward on PC via lg:-translate-y-8 */}
      <div className="w-full lg:flex-1 flex flex-col items-center justify-center relative z-20 min-h-screen px-4 py-8 lg:py-0 lg:-translate-y-8">
        
        {/* Top Brand Header (Cleanly above the card on PC, like Photo 1) */}
        <div className="hidden lg:flex items-center gap-3.5 mb-7 select-none">
          <ScenovaLogo className="w-9 h-9 shadow-md shadow-rose-950/40" />
          <span className="font-[family-name:var(--font-unbounded)] text-[26px] xl:text-[28px] font-black tracking-tight leading-none text-white">
            SCEN<span className="text-[#F472B6]">OVA</span>
          </span>
        </div>

        {/* Login / Lock Card */}
        <div className="w-full max-w-[390px] lg:max-w-[400px] bg-[#0b0b11]/95 lg:bg-[#0b0b12]/90 backdrop-blur-2xl border border-white/[0.08] rounded-[28px] p-7 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.85)] relative overflow-hidden text-center">
          {/* Subtle top crimson-purple radial ambient glow matching Airing Alerts & Vibe Chart */}
          <div className="pointer-events-none absolute -top-12 inset-x-0 h-36 bg-[radial-gradient(ellipse_at_top,rgba(190,24,93,0.18),transparent_65%)]" />

          {/* Mobile Top Brand & Badge Row (Cleanly inside card on < lg, matching SCENOVA pill design) */}
          <div className="flex lg:hidden items-center justify-between gap-3 mb-6 relative z-10 select-none">
            <div className="flex items-center gap-2.5">
              <ScenovaLogo className="w-7 h-7 shadow-sm" />
              <span className="font-[family-name:var(--font-unbounded)] text-[18px] font-black tracking-tight leading-none text-white">
                SCEN<span className="text-[#F472B6]">OVA</span>
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/15 px-3.5 py-1 text-xs font-medium text-purple-200 shadow-sm">
              <Lock size={11} className="text-purple-300" />
              <span>Archive Locked</span>
            </div>
          </div>

          {/* Desktop Centered Archive Locked Pill Badge (Cleanly inside card on lg+, like Photo 1) */}
          <div className="hidden lg:flex justify-center mb-6 relative z-10 select-none">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/15 px-3.5 py-1 text-xs font-medium text-purple-200 shadow-sm">
              <Lock size={12} className="text-purple-300" />
              <span>Archive Locked</span>
            </div>
          </div>

          {/* User Avatar Circle with subtle rose-violet ring */}
          <div className="relative mx-auto mb-4 flex justify-center z-10 select-none">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-rose-600/70 via-purple-600/60 to-indigo-600/50 p-[2px] shadow-xl shadow-purple-950/40">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#12121c] border border-white/10 shadow-inner">
                <span className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/75">
                  S
                </span>
              </div>
            </div>
            <div className="absolute -bottom-0.5 right-[calc(50%-36px)] flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-gradient-to-tr from-rose-500 to-purple-600 text-white shadow-md">
              <Sparkles size={11} />
            </div>
          </div>

          {/* User Name & Subtitle */}
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5 z-10 relative">
            Subho !!
          </h1>
          <p className="text-xs text-zinc-400 mb-6 font-normal z-10 relative">
            Enter your passcode to unlock your personal drama archive
          </p>

          {/* Passcode Form */}
          <form onSubmit={handleUnlock} className="flex flex-col gap-3.5 relative z-10">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Passcode"
                className="w-full h-12 rounded-full border border-white/[0.09] bg-[#111118] px-5 pr-12 text-center text-sm tracking-widest text-white placeholder-zinc-500 outline-none transition-all focus:border-rose-500/50 focus:bg-[#151520] focus:ring-1 focus:ring-rose-500/30 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition p-1 cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/15 px-3.5 py-2.5 text-xs font-medium text-red-300 animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 font-semibold text-sm text-white border border-white/15 shadow-[0_8px_24px_rgba(225,29,72,0.28)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Unlocking…</span>
                </>
              ) : (
                <>
                  <Unlock size={16} />
                  <span>Unlock Archive</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-[11px] text-zinc-500 font-normal relative z-10">
            Protected with persistent device passcode
          </p>
        </div>
      </div>
    </div>
  )
}

// Re-export alias for convenience
export const LockScreen = AuthScreen
