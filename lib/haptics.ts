// Tactile Haptic Feedback Engine for Native iOS/Android Web App Feel

export const haptic = {
  /**
   * Light tap (10ms): Bottom tab switches, opening a modal, tapping Alerts / Lock pills
   */
  light: () => {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(10)
      } catch {
        // Ignore devices that don't allow vibration
      }
    }
  },

  /**
   * Medium tap (18ms): Starting Watch, Rewatch, or toggling Watchlist | Watching | Finished pills
   */
  medium: () => {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(18)
      } catch {
        // Ignore
      }
    }
  },

  /**
   * Success sequence [12, 40, 22]: Marking drama Finished, unlocking PIN, or toggling Alerts ON
   */
  success: () => {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([12, 40, 22])
      } catch {
        // Ignore
      }
    }
  },

  /**
   * Warning sequence [28, 45, 28]: Deleting drama from list, wrong PIN code
   */
  warning: () => {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([28, 45, 28])
      } catch {
        // Ignore
      }
    }
  },
}
