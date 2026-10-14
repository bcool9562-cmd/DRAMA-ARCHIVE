'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  text: string
}

let toastListener: ((toast: ToastMessage) => void) | null = null

export function showToast(text: string, type: 'success' | 'error' | 'info' = 'success') {
  if (toastListener) {
    toastListener({ id: Math.random().toString(), text, type })
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    toastListener = (newToast) => {
      setToasts((prev) => [...prev.slice(-2), newToast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
      }, 3500)
    }
    return () => {
      toastListener = null
    }
  }, [])

  return (
    <div className="fixed top-4 inset-x-0 z-[100] flex flex-col items-center pointer-events-none gap-2 px-4 pt-[env(safe-area-inset-top,8px)]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-full px-4 py-2.5 text-xs font-semibold backdrop-blur-2xl border shadow-xl ${
              toast.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/40 text-rose-200 shadow-rose-950/50'
                : toast.type === 'info'
                ? 'bg-sky-950/80 border-sky-500/40 text-sky-200 shadow-sky-950/50'
                : 'bg-black/80 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle size={15} className="text-rose-400 flex-shrink-0" />
            ) : toast.type === 'info' ? (
              <Info size={15} className="text-sky-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
            )}
            <span>{toast.text}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-1 text-white/40 hover:text-white"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
