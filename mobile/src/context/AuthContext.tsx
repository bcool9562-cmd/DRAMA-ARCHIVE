import React, { createContext, useContext, useEffect, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as LocalAuthentication from 'expo-local-authentication'
import * as Haptics from 'expo-haptics'

const LOCK_ENABLED_KEY = '@scenova_lock_enabled'
const PIN_CODE_KEY = '@scenova_pin_code'
const DEFAULT_PIN = '1234'

interface AuthContextValue {
  isLocked: boolean
  isLockEnabled: boolean
  hasBiometrics: boolean
  setLockEnabled: (enabled: boolean) => Promise<void>
  unlockWithPin: (pin: string) => Promise<boolean>
  authenticateBiometrics: () => Promise<boolean>
  lockNow: () => void
  unlockNow: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [isLockEnabled, setIsLockEnabledState] = useState<boolean>(true)
  const [pinCode, setPinCode] = useState<string>(DEFAULT_PIN)
  const [hasBiometrics, setHasBiometrics] = useState<boolean>(false)

  // 1. Initialize biometrics and lock preferences on startup
  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      try {
        const [savedEnabled, savedPin, compatible, enrolled] = await Promise.all([
          AsyncStorage.getItem(LOCK_ENABLED_KEY),
          AsyncStorage.getItem(PIN_CODE_KEY),
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ])

        if (!isMounted) return

        setHasBiometrics(compatible && enrolled)

        if (savedPin) {
          setPinCode(savedPin)
        }

        // Lock enabled by default or saved pref
        const enabled = savedEnabled !== null ? savedEnabled === 'true' : true
        setIsLockEnabledState(enabled)
        // If enabled, lock on fresh start
        if (enabled) {
          setIsLocked(true)
        }
      } catch (e) {
        console.warn('[AuthContext] init error:', e)
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
  }, [])

  // 2. Auto-lock on AppState change (background / inactive) with zero screen blink
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (isLockEnabled) {
          setIsLocked(true)
        }
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => {
      subscription.remove()
    }
  }, [isLockEnabled])

  const setLockEnabled = async (enabled: boolean) => {
    setIsLockEnabledState(enabled)
    await AsyncStorage.setItem(LOCK_ENABLED_KEY, String(enabled))
    if (!enabled) {
      setIsLocked(false)
    }
  }

  const unlockWithPin = async (inputPin: string): Promise<boolean> => {
    if (inputPin === pinCode) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      setIsLocked(false)
      return true
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } catch {}
      return false
    }
  }

  const authenticateBiometrics = async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock SCENOVA',
        cancelLabel: 'Use PIN',
        fallbackLabel: 'Enter PIN',
        disableDeviceFallback: false,
      })

      if (result.success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch {}
        setIsLocked(false)
        return true
      }
      return false
    } catch (err) {
      console.warn('[AuthContext] Biometric error:', err)
      return false
    }
  }

  const lockNow = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}
    setIsLocked(true)
  }

  const unlockNow = () => {
    setIsLocked(false)
  }

  return (
    <AuthContext.Provider
      value={{
        isLocked,
        isLockEnabled,
        hasBiometrics,
        setLockEnabled,
        unlockWithPin,
        authenticateBiometrics,
        lockNow,
        unlockNow,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
