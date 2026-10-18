import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet, RefreshControl } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import * as Haptics from 'expo-haptics'
import { ArchiveItem, Drama, DramaStatus } from '../types'
import { DramaCard } from '../components/DramaCard'
import { useArchive } from '../context/ArchiveContext'

interface ListScreenProps {
  status: DramaStatus
  title: string
  subtitle: string
  onSelectDrama: (drama: Drama | ArchiveItem) => void
}

export const ListScreen: React.FC<ListScreenProps> = ({
  status,
  title,
  subtitle,
  onSelectDrama,
}) => {
  const { watchlist, watching, finished, refreshData } = useArchive()
  const [refreshing, setRefreshing] = useState<boolean>(false)

  const dramas = status === 'watchlist'
    ? watchlist
    : status === 'watching'
    ? watching
    : finished

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await refreshData()
    } finally {
      setRefreshing(false)
    }
  }, [refreshData])

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Nothing here yet</Text>
      <Text style={styles.emptySubtitle}>
        {status === 'watchlist'
          ? 'Browse Explore to add upcoming or backlog dramas to your Watchlist.'
          : status === 'watching'
          ? 'Move dramas you are actively watching here to track them.'
          : 'Completed dramas will appear here as your finished archive.'}
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{dramas.length}</Text>
        </View>
      </View>

      <FlashList
        data={dramas}
        renderItem={({ item }) => (
          <View style={styles.cardItemWrapper}>
            <DramaCard drama={item} onPress={onSelectDrama} />
          </View>
        )}
        keyExtractor={(item) => item.drama_id}
        estimatedItemSize={290}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#a855f7"
            colors={['#7c3aed']}
          />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  countText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    paddingTop: 8,
  },
  cardItemWrapper: {
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})
