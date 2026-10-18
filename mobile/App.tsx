import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Compass, Bookmark, Play, CheckCheck } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { ArchiveProvider } from './src/context/ArchiveContext'
import { AuthProvider } from './src/context/AuthContext'
import { TopHeader } from './src/components/TopHeader'
import { HomeScreen } from './src/screens/HomeScreen'
import { ListScreen } from './src/screens/ListScreen'
import { DramaDetailScreen } from './src/screens/DramaDetailScreen'
import { LockScreen } from './src/screens/LockScreen'
import { AlertsModal } from './src/screens/AlertsModal'
import { Drama, ArchiveItem } from './src/types'
import { requestNotificationPermissions, scheduleDailyWittyReminder } from './src/lib/notifications'

type TabType = 'explore' | 'watchlist' | 'watching' | 'finished'

const MainAppContent: React.FC = () => {
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<TabType>('explore')
  const [selectedDrama, setSelectedDrama] = useState<Drama | ArchiveItem | null>(null)
  const [alertsVisible, setAlertsVisible] = useState<boolean>(false)

  useEffect(() => {
    // Request notification permissions and schedule daily witty notifications
    requestNotificationPermissions().then((granted) => {
      if (granted) {
        scheduleDailyWittyReminder()
      }
    })
  }, [])

  const handleTabPress = (tab: TabType) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    setActiveTab(tab)
  }

  const handleSelectDrama = (drama: Drama | ArchiveItem) => {
    setSelectedDrama(drama)
  }

  const handleBackFromDetail = () => {
    setSelectedDrama(null)
  }

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#050507" translucent={false} />

      {/* Top Header */}
      <TopHeader onOpenAlerts={() => setAlertsVisible(true)} />

      {/* Main Tab Screen Container */}
      <View style={styles.screenContainer}>
        {activeTab === 'explore' && <HomeScreen onSelectDrama={handleSelectDrama} />}
        {activeTab === 'watchlist' && (
          <ListScreen
            status="watchlist"
            title="Watchlist"
            subtitle="Curated dramas queued for later"
            onSelectDrama={handleSelectDrama}
          />
        )}
        {activeTab === 'watching' && (
          <ListScreen
            status="watching"
            title="Watching"
            subtitle="Dramas in progress"
            onSelectDrama={handleSelectDrama}
          />
        )}
        {activeTab === 'finished' && (
          <ListScreen
            status="finished"
            title="Finished"
            subtitle="Completed drama archive"
            onSelectDrama={handleSelectDrama}
          />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => handleTabPress('explore')}
          activeOpacity={0.7}
        >
          <Compass
            size={22}
            color={activeTab === 'explore' ? '#a855f7' : '#64748b'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'explore' && styles.tabLabelActive,
            ]}
          >
            Explore
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => handleTabPress('watchlist')}
          activeOpacity={0.7}
        >
          <Bookmark
            size={22}
            color={activeTab === 'watchlist' ? '#a855f7' : '#64748b'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'watchlist' && styles.tabLabelActive,
            ]}
          >
            Watchlist
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => handleTabPress('watching')}
          activeOpacity={0.7}
        >
          <Play
            size={22}
            color={activeTab === 'watching' ? '#a855f7' : '#64748b'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'watching' && styles.tabLabelActive,
            ]}
          >
            Watching
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => handleTabPress('finished')}
          activeOpacity={0.7}
        >
          <CheckCheck
            size={22}
            color={activeTab === 'finished' ? '#a855f7' : '#64748b'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'finished' && styles.tabLabelActive,
            ]}
          >
            Finished
          </Text>
        </TouchableOpacity>
      </View>

      {/* Drama Detail Screen Overlay */}
      {selectedDrama && (
        <View style={StyleSheet.absoluteFill}>
          <DramaDetailScreen
            drama={selectedDrama}
            onBack={handleBackFromDetail}
          />
        </View>
      )}

      {/* Drama Alerts Modal */}
      <AlertsModal
        visible={alertsVisible}
        onClose={() => setAlertsVisible(false)}
        onSelectDramaId={(id) => {
          setSelectedDrama({ dramaId: id, title: 'Drama' } as any)
        }}
      />

      {/* Lock Screen Modal */}
      <LockScreen />
    </View>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ArchiveProvider>
            <MainAppContent />
          </ArchiveProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#050507',
  },
  screenContainer: {
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5, 5, 7, 0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    zIndex: 90,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#a855f7',
    fontWeight: '800',
  },
})
