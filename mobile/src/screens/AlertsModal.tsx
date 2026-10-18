import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { Image } from 'expo-image'
import { X, Bell, Calendar, Sparkles } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useArchive } from '../context/ArchiveContext'
import { scheduleDramaReminder } from '../lib/notifications'

interface AlertsModalProps {
  visible: boolean
  onClose: () => void
  onSelectDramaId: (id: string) => void
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  visible,
  onClose,
  onSelectDramaId,
}) => {
  const { alerts } = useArchive()

  const handleTestReminder = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {}
    await scheduleDramaReminder(
      '🍿 SCENOVA Cliffhanger Reminder',
      'New episode alert: Time to jump back into your favorite drama!',
      3
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Bell size={20} color="#a855f7" />
              <Text style={styles.headerTitle}>Drama Alerts</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                } catch {}
                onClose()
              }}
              activeOpacity={0.7}
            >
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Test reminder pill */}
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestReminder}
            activeOpacity={0.8}
          >
            <Sparkles size={14} color="#c084fc" />
            <Text style={styles.testBtnText}>Send Test Drama Reminder (3s)</Text>
          </TouchableOpacity>

          {/* Alerts List */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {alerts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptySubtitle}>
                  Add upcoming dramas to your Watchlist or ongoing dramas to Watching to receive automated airdate notifications.
                </Text>
              </View>
            ) : (
              alerts.map((alert, index) => (
                <TouchableOpacity
                  key={`alert-${alert.dramaId}-${index}`}
                  style={styles.alertCard}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    } catch {}
                    onClose()
                    onSelectDramaId(alert.dramaId)
                  }}
                  activeOpacity={0.8}
                >
                  {alert.posterUrl ? (
                    <Image
                      source={{ uri: alert.posterUrl }}
                      style={styles.poster}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.posterPlaceholder} />
                  )}

                  <View style={styles.alertInfo}>
                    <Text style={styles.alertTitle} numberOfLines={1}>
                      {alert.title}
                    </Text>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    {alert.airingDate && (
                      <View style={styles.dateRow}>
                        <Calendar size={11} color="#a855f7" />
                        <Text style={styles.dateText}>{alert.airingDate}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0c0c12',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '80%',
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.28)',
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  testBtnText: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 12,
  },
  poster: {
    width: 48,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#1a1a24',
  },
  posterPlaceholder: {
    width: 48,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#1a1a24',
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  alertMessage: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
})
