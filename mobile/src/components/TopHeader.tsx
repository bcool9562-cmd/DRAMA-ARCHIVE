import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bell, Lock } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useAuth } from '../context/AuthContext'
import { useArchive } from '../context/ArchiveContext'

interface TopHeaderProps {
  onOpenAlerts: () => void
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenAlerts }) => {
  const insets = useSafeAreaInsets()
  const { lockNow } = useAuth()
  const { alerts } = useArchive()

  const handleAlertsPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    onOpenAlerts()
  }

  const handleLockPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}
    lockNow()
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.content}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>SCENOVA</Text>
          <View style={styles.dot} />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleAlertsPress}
            activeOpacity={0.7}
            accessibilityLabel="Alerts"
          >
            <Bell size={20} color="#e2e8f0" />
            {alerts.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{alerts.length > 9 ? '9+' : alerts.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.lockBtn]}
            onPress={handleLockPress}
            activeOpacity={0.7}
            accessibilityLabel="Lock App"
          >
            <Lock size={18} color="#a855f7" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#050507',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 100,
  },
  content: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#ffffff',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7c3aed',
    marginLeft: 4,
    marginTop: -4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockBtn: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
})
