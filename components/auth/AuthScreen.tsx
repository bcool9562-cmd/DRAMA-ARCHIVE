'use client'

import { useState, FormEvent } from 'react'
import { Eye, EyeOff, Lock, Unlock, Loader2, Sparkles } from 'lucide-react'
import MovingPosterWall from '@/components/wall/MovingPosterWall'
import ScenovaLogo from '@/components/brand/ScenovaLogo'

interface AuthScreenProps {
  onAuthenticated: () => void
}

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
      const res = await fetch('/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Incorrect passcode.')
        return
      }

      // Successful unlock
      onAuthenticated()
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      {/* Moving Poster Wall Background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-90 scale-105">
        <MovingPosterWall interactive={false} speedSeconds={50} className="h-full w-full" />
      </div>

      {/* Crisp dark radial vignette without ANY backdrop-blur filter */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.25)_0%,rgba(0,0,0,0.82)_100%)]" />

      {/* Lock Card */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-[32px] border border-white/[0.15] bg-white/[0.07] px-8 py-10 shadow-2xl shadow-black/80 backdrop-blur-2xl text-center">
          
          {/* SCENOVA Brand Mark */}
          <div className="mb-6 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2.5">
              <ScenovaLogo className="w-8 h-7 text-white fill-current flex-shrink-0" />
              <span className="text-[22px] font-black uppercase tracking-[0.06em] scale-x-[1.08] origin-left text-white select-none leading-none">
                SCENOVA
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-3.5 py-1 text-[11px] font-medium text-white/60 shadow-inner">
              <Lock size={12} className="text-white/70" />
              <span>Archive Locked</span>
            </div>
          </div>

          {/* User Avatar */}
          <div className="mx-auto mb-4 flex justify-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-500 p-[2.5px] shadow-xl shadow-purple-900/40">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-black/80 backdrop-blur-md">
                  <span className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/70">
                    S
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-purple-600 text-white shadow-md">
                <Sparkles size={13} />
              </div>
            </div>
          </div>

          {/* Name & Subtitle */}
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            Subho !!
          </h1>
          <p className="text-xs text-white/45 mb-7">
            Personal Archive · Touch or Enter Passcode
          </p>

          {/* Password Form */}
          <form onSubmit={handleUnlock} className="flex flex-col gap-3.5">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Passcode"
                className="w-full rounded-2xl border border-white/[0.15] bg-white/[0.06] px-4 py-3.5 pr-11 text-center text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-400/60 focus:bg-white/[0.10] focus:ring-2 focus:ring-purple-400/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition"
                tabIndex={-1}
                aria-label={showPassword ? "Hide passcode" : "Show passcode"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-300 animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/40 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
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

          <p className="mt-7 text-[11px] text-white/30">
            Protected with persistent device passcode
          </p>
        </div>
      </div>
    </div>
  )
}
