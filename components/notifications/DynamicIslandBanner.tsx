'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Sparkles, X } from 'lucide-react'
import { haptic } from '@/lib/haptics'

export interface DynamicIslandMessage {
  title: string
  body: string
  icon?: string
  id?: string
  duration?: number
}

export function showDynamicIsland(msg: DynamicIslandMessage) {
  if (typeof window !== 'undefined') {
    haptic.light()
    window.dispatchEvent(
      new CustomEvent('scenova-dynamic-island', {
        detail: { ...msg, id: msg.id || String(Date.now()) },
      })
    )
  }
}

export default function DynamicIslandBanner() {
  const [current, setCurrent] = useState<DynamicIslandMessage | null>(null)

  useEffect(() => {
    function handleEvent(e: Event) {
      const customEvent = e as CustomEvent<DynamicIslandMessage>
      if (customEvent.detail) {
        setCurrent(customEvent.detail)
      }
    }

    window.addEventListener('scenova-dynamic-island', handleEvent)
    return () => window.removeEventListener('scenova-dynamic-island', handleEvent)
  }, [])

  useEffect(() => {
    if (!current) return
    const timer = setTimeout(() => {
      setCurrent(null)
    }, current.duration || 5000)

    return () => clearTimeout(timer)
  }, [current])

  return (
    <div className="fixed top-2.5 sm:top-4 inset-x-0 z-[150] flex justify-center pointer-events-none px-3">
      <AnimatePresence>
        {current && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -15 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="
              pointer-events-auto max-w-[390px] w-full
              rounded-[26px] bg-[#0c0c14]/94 backdrop-blur-3xl
              border border-white/[0.20]
              shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_16px_40px_rgba(0,0,0,0.85)]
              p-2.5 pl-3 flex items-center justify-between gap-3 select-none touch-manipulation
            "
          >
            {/* Left Dynamic Island glowing icon capsule */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-500 text-white shadow-md flex-shrink-0">
                <Bell size={14} className="animate-pulse" />
              </div>

              {/* Text copy */}
              <div className="flex flex-col min-w-0 flex-1 pr-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[12px] font-bold text-white tracking-tight leading-tight truncate">
                    {current.title}
                  </h4>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                </div>
                <p className="text-[11px] font-medium text-white/75 leading-snug line-clamp-2 mt-0.5">
                  {current.body}
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setCurrent(null)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/60 hover:text-white transition active:scale-90 flex-shrink-0"
              aria-label="Dismiss banner"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
