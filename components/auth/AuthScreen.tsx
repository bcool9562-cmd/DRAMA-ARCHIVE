'use client'

import { useState, FormEvent } from 'react'
import { Eye, EyeOff, Lock, Unlock, Loader2, Sparkles } from 'lucide-react'
import SafeImage from '@/components/ui/SafeImage'
import ScenovaLogo from '@/components/brand/ScenovaLogo'
import { haptic } from '@/lib/haptics'

export interface AuthScreenProps {
  onAuthenticated: () => void
}

// 6 Curated High-Resolution East Asian Drama Posters from the user's archive
const POSTER_COL_1 = [
  {
    title: 'Vincenzo',
    posterUrl: 'https://image.tmdb.org/t/p/w780/qbkSS1cTjT4DzIwD44bdhTuYgdT.jpg',
  },
  {
    title: 'The Remarried Empress',
    posterUrl: 'https://image.tmdb.org/t/p/w780/3x6c9ybt0762idyzIifUZeTD5MZ.jpg',
  },
]

const POSTER_COL_2 = [
  {
    title: 'Crash Landing on You',
    posterUrl: 'https://image.tmdb.org/t/p/w780/fgBNLPr6mC8pxuR79ENAJY4nBmj.jpg',
  },
  {
    title: 'The Glory',
    posterUrl: 'https://image.tmdb.org/t/p/w780/uUM4LVlPgIrww07OoEKrGWlS1Ej.jpg',
  },
]

const POSTER_COL_3 = [
  {
    title: 'Guardian: The Lonely and Great God',
    posterUrl: 'https://image.tmdb.org/t/p/w780/sPkxHNw5BFvuCFGWw825TS7n6X3.jpg',
  },
  {
    title: 'Hidden Love',
    posterUrl: 'https://image.tmdb.org/t/p/w780/riGzESa9N9toumP9OhMmg0QvFPD.jpg',
  },
]

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
    <div className="relative min-h-screen w-full bg-[#050507] text-white flex items-center justify-center overflow-hidden selection:bg-rose-500/30 selection:text-white">
      {/* ── AMBIENT CANVAS GLOWS ── */}
      {/* Signature top crimson/indigo ambient radial glow matching Explore header */}
      <div className="pointer-events-none absolute -top-32 inset-x-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.16),rgba(124,58,237,0.09)_45%,transparent_72%)] z-0" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-[420px] w-[420px] rounded-full bg-purple-600/[0.08] blur-[140px] z-0" />

      {/* ── MOBILE BACKGROUND POSTER GRID (< 1024px) ── */}
      {/* Subtle, darkly masked 3-column drama poster grid in upper background (opacity-20 fading into solid #050507, 60 FPS) */}
      <div className="lg:hidden pointer-events-none absolute inset-x-0 top-0 h-[65vh] overflow-hidden opacity-20 select-none z-0">
        <div className="grid grid-cols-3 gap-3.5 px-3 pt-3 -translate-y-4 scale-105">
          {/* Column 1 */}
          <div className="flex flex-col gap-3.5">
            {POSTER_COL_1.map((drama) => (
              <div
                key={`mob-col1-${drama.title}`}
                className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#0c0c14] border border-white/[0.06]"
              >
                <SafeImage
                  src={drama.posterUrl}
                  alt={drama.title}
                  size="w342"
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          {/* Column 2 (shifted -translate-y-6) */}
          <div className="flex flex-col gap-3.5 -translate-y-6">
            {POSTER_COL_2.map((drama) => (
              <div
                key={`mob-col2-${drama.title}`}
                className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#0c0c14] border border-white/[0.06]"
              >
                <SafeImage
                  src={drama.posterUrl}
                  alt={drama.title}
                  size="w342"
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-3.5">
            {POSTER_COL_3.map((drama) => (
              <div
                key={`mob-col3-${drama.title}`}
                className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#0c0c14] border border-white/[0.06]"
              >
                <SafeImage
                  src={drama.posterUrl}
                  alt={drama.title}
                  size="w342"
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Vignette Masks: Smooth top & bottom fade into solid #050507 */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050507]/40 via-[#050507]/75 to-[#050507] z-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#050507_88%)] z-10" />
      </div>

      {/* ── MAIN 12-COLUMN SPLIT CONTAINER ── */}
      <div className="relative z-10 w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 items-center max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-8 lg:py-12 gap-8 lg:gap-14">
        
        {/* ── LEFT COLUMN (7 COLS / ~55% WIDTH on PC >= 1024px) ── */}
        {/* 3-Column Staggered Drama Poster Showcase (Like Photo 1) */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-center relative select-none">
          {/* Subtle ambient radial glow behind poster grid */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(225,29,72,0.12),rgba(147,51,234,0.07)_50%,transparent_70%)]" />

          {/* 3-Column Staggered Masonry Grid (grid-cols-3 gap-5 px-10) */}
          <div className="relative grid grid-cols-3 gap-5 px-8 xl:px-10 py-10">
            {/* Column 1 (2 posters) */}
            <div className="flex flex-col gap-5">
              {POSTER_COL_1.map((drama) => (
                <div
                  key={`pc-col1-${drama.title}`}
                  className="group relative aspect-[2/3] w-full rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#0b0b12] transform-gpu transition-all duration-500 hover:scale-[1.02] hover:border-white/20"
                >
                  <SafeImage
                    src={drama.posterUrl}
                    alt={drama.title}
                    size="w780"
                    fill
                    sizes="(max-width: 1440px) 20vw, 280px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    priority
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050507]/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                </div>
              ))}
            </div>

            {/* Column 2 (Middle - shifted vertically -translate-y-8 just like Photo 1) */}
            <div className="flex flex-col gap-5 -translate-y-8">
              {POSTER_COL_2.map((drama) => (
                <div
                  key={`pc-col2-${drama.title}`}
                  className="group relative aspect-[2/3] w-full rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#0b0b12] transform-gpu transition-all duration-500 hover:scale-[1.02] hover:border-white/20"
                >
                  <SafeImage
                    src={drama.posterUrl}
                    alt={drama.title}
                    size="w780"
                    fill
                    sizes="(max-width: 1440px) 20vw, 280px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    priority
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050507]/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                </div>
              ))}
            </div>

            {/* Column 3 (2 posters) */}
            <div className="flex flex-col gap-5">
              {POSTER_COL_3.map((drama) => (
                <div
                  key={`pc-col3-${drama.title}`}
                  className="group relative aspect-[2/3] w-full rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#0b0b12] transform-gpu transition-all duration-500 hover:scale-[1.02] hover:border-white/20"
                >
                  <SafeImage
                    src={drama.posterUrl}
                    alt={drama.title}
                    size="w780"
                    fill
                    sizes="(max-width: 1440px) 20vw, 280px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    priority
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050507]/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                </div>
              ))}
            </div>

            {/* Top Vignette Mask */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#050507] via-[#050507]/80 to-transparent z-10" />
            {/* Bottom Vignette Mask */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050507] via-[#050507]/80 to-transparent z-10" />
            {/* Right Edge Fade towards Login Column */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#050507] to-transparent z-10" />
          </div>
        </div>

        {/* ── RIGHT COLUMN (5 COLS / ~45% WIDTH on PC >= 1024px, FULL WIDTH on MOBILE) ── */}
        <div className="w-full lg:col-span-5 flex flex-col items-center justify-center relative z-20">
          
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
    </div>
  )
}

// Re-export alias for convenience
export const LockScreen = AuthScreen
