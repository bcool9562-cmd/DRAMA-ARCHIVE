import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Search, X } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useArchive } from '../context/ArchiveContext'
import { searchDramas } from '../api/client'
import { Drama, ArchiveItem } from '../types'
import { DramaCard } from '../components/DramaCard'
import { VibeChart } from '../components/VibeChart'
import { PosterWallMarquee } from '../components/PosterWallMarquee'

interface HomeScreenProps {
  onSelectDrama: (drama: Drama | ArchiveItem) => void
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectDrama }) => {
  const { discoverData, refreshData, archive } = useArchive()
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<Drama[]>([])
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [refreshing, setRefreshing] = useState<boolean>(false)

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timeout = setTimeout(async () => {
      try {
        const results = await searchDramas(searchQuery.trim())
        setSearchResults(results)
      } catch (err) {
        console.warn('Search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await refreshData()
    } finally {
      setRefreshing(false)
    }
  }, [refreshData])

  const clearSearch = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    setSearchQuery('')
    setSearchResults([])
  }

  // Combined drama pool for poster marquee
  const marqueeDramas = discoverData?.hero?.length
    ? discoverData.hero
    : discoverData?.talkOfTheTown || []

  const talkDramas = discoverData?.talkOfTheTown || []

  return (
    <View style={styles.container}>
      {/* Top Ambient Purple-Teal Gradient Glow */}
      <LinearGradient
        colors={['rgba(124, 58, 237, 0.45)', 'rgba(13, 148, 136, 0.22)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.8 }}
        style={styles.ambientGlow}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#a855f7"
            colors={['#7c3aed']}
          />
        }
      >
        {/* Header Title */}
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Explore.</Text>
          <Text style={styles.headerSubtitle}>Discover curated Asian dramas</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarWrapper}>
          <Search size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dramas, cast, titles..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {isSearching && (
            <ActivityIndicator size="small" color="#a855f7" style={styles.searchSpinner} />
          )}
          {searchQuery.length > 0 && !isSearching && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn} activeOpacity={0.7}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Display */}
        {searchQuery.trim().length > 0 ? (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              Search Results {searchResults.length > 0 ? `(${searchResults.length})` : ''}
            </Text>

            {searchResults.length === 0 && !isSearching ? (
              <View style={styles.emptyResults}>
                <Text style={styles.emptyResultsText}>No dramas found matching "{searchQuery}"</Text>
              </View>
            ) : (
              <View style={styles.gridContainer}>
                {searchResults.map((drama) => (
                  <DramaCard
                    key={`search-${drama.dramaId || drama.tmdbId}`}
                    drama={drama}
                    onPress={onSelectDrama}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Moving Poster Wall Marquee */}
            {marqueeDramas.length > 0 && (
              <PosterWallMarquee
                dramas={marqueeDramas}
                onPressDrama={onSelectDrama}
              />
            )}

            {/* Vibe Chart Donut */}
            <VibeChart />

            {/* Talk Of The Town */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Talk Of The Town</Text>
                <Text style={styles.sectionBadge}>Trending Now</Text>
              </View>

              <View style={styles.gridContainer}>
                {talkDramas.map((drama) => (
                  <DramaCard
                    key={`talk-${drama.dramaId || drama.tmdbId}`}
                    drama={drama}
                    onPress={onSelectDrama}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  headerTitleRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
  },
  searchSpinner: {
    marginLeft: 8,
  },
  clearBtn: {
    padding: 6,
  },
  sectionContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionBadge: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyResults: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyResultsText: {
    color: '#64748b',
    fontSize: 14,
  },
})
