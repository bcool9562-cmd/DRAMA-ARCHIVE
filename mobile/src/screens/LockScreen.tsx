import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native'
import { Fingerprint, Delete, ShieldAlert } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useAuth } from '../context/AuthContext'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const KEY_SIZE = Math.min(SCREEN_WIDTH * 0.18, 72)

export const LockScreen: React.FC = () => {
  const { isLocked, hasBiometrics, unlockWithPin, authenticateBiometrics } = useAuth()
  const [enteredPin, setEnteredPin] = useState<string>('')
  const [errorShake, setErrorShake] = useState<boolean>(false)

  // Try biometric prompt automatically when lock screen mounts
  useEffect(() => {
    if (isLocked && hasBiometrics) {
      const timeout = setTimeout(() => {
        authenticateBiometrics()
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [isLocked, hasBiometrics])

  // Reset entered PIN when lock state opens
  useEffect(() => {
    if (isLocked) {
      setEnteredPin('')
      setErrorShake(false)
    }
  }, [isLocked])

  const handleKeyPress = async (digit: string) => {
    if (enteredPin.length >= 4) return

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}

    const newPin = enteredPin + digit
    setEnteredPin(newPin)

    if (newPin.length === 4) {
      const success = await unlockWithPin(newPin)
      if (!success) {
        setErrorShake(true)
        setTimeout(() => {
          setEnteredPin('')
          setErrorShake(false)
        }, 500)
      }
    }
  }

  const handleDelete = () => {
    if (enteredPin.length === 0) return
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    setEnteredPin(prev => prev.slice(0, -1))
    setErrorShake(false)
  }

  const handleBiometricPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}
    authenticateBiometrics()
  }

  if (!isLocked) return null

  return (
    <Modal
      visible={isLocked}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Header Icon & Title */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <ShieldAlert size={32} color="#a855f7" />
          </View>
          <Text style={styles.title}>SCENOVA LOCKED</Text>
          <Text style={styles.subtitle}>Enter 4-digit PIN to access your drama archive</Text>
        </View>

        {/* 4 PIN Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((index) => {
            const filled = enteredPin.length > index
            return (
              <View
                key={`dot-${index}`}
                style={[
                  styles.dot,
                  filled && styles.dotFilled,
                  errorShake && styles.dotError,
                ]}
              />
            )
          })}
        </View>

        {/* Numeric Keypad */}
        <View style={styles.keypad}>
          <View style={styles.keypadRow}>
            {['1', '2', '3'].map((digit) => (
              <TouchableOpacity
                key={digit}
                style={styles.keyBtn}
                onPress={() => handleKeyPress(digit)}
                activeOpacity={0.65}
              >
                <Text style={styles.keyText}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.keypadRow}>
            {['4', '5', '6'].map((digit) => (
              <TouchableOpacity
                key={digit}
                style={styles.keyBtn}
                onPress={() => handleKeyPress(digit)}
                activeOpacity={0.65}
              >
                <Text style={styles.keyText}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.keypadRow}>
            {['7', '8', '9'].map((digit) => (
              <TouchableOpacity
                key={digit}
                style={styles.keyBtn}
                onPress={() => handleKeyPress(digit)}
                activeOpacity={0.65}
              >
                <Text style={styles.keyText}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.keypadRow}>
            {/* Biometric Button */}
            {hasBiometrics ? (
              <TouchableOpacity
                style={[styles.keyBtn, styles.specialKey]}
                onPress={handleBiometricPress}
                activeOpacity={0.65}
              >
                <Fingerprint size={28} color="#a855f7" />
              </TouchableOpacity>
            ) : (
              <View style={[styles.keyBtn, styles.emptyKey]} />
            )}

            {/* Zero */}
            <TouchableOpacity
              style={styles.keyBtn}
              onPress={() => handleKeyPress('0')}
              activeOpacity={0.65}
            >
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>

            {/* Backspace */}
            <TouchableOpacity
              style={[styles.keyBtn, styles.specialKey]}
              onPress={handleDelete}
              activeOpacity={0.65}
            >
              <Delete size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 6,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 44,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  dotFilled: {
    backgroundColor: '#a855f7',
    borderColor: '#c084fc',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  dotError: {
    backgroundColor: '#ef4444',
    borderColor: '#f87171',
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  keyBtn: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialKey: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  emptyKey: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  keyText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
})
