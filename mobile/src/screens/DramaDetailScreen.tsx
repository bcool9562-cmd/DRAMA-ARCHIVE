import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronLeft, Star, Film, Calendar, Globe, Sparkles } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { ArchiveItem, Drama, DramaStatus } from '../types'
import { fetchDramaDetail } from '../api/client'
import { useArchive } from '../context/ArchiveContext'

interface DramaDetailScreenProps {
  drama: Drama | ArchiveItem
  onBack: () => void
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const HERO_HEIGHT = SCREEN_WIDTH * 1.25

export const DramaDetailScreen: React.FC<DramaDetailScreenProps> = ({ drama: initialDrama, onBack }) => {
  const insets = useSafeAreaInsets()
  const { updateDramaStatus, getDramaStatus } = useArchive()
  const [drama, setDrama] = useState<any>(initialDrama)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)

  const dramaId = String(
    (drama as any).drama_id ||
    (drama as any).dramaId ||
    (drama as any).tmdbId ||
    (drama as any).id
  )

  // Fetch full details if not loaded (overview, cast, vibe)
  useEffect(() => {
    let isMounted = true
    async function loadDetails() {
      if (dramaId) {
        setDetailLoading(true)
        try {
          const detail = await fetchDramaDetail(dramaId)
          if (detail && isMounted) {
            setDrama((prev: any) => ({
              ...prev,
              ...detail,
            }))
          }
        } catch (e) {
          console.warn('Failed to load drama details:', e)
        } finally {
          if (isMounted) setDetailLoading(false)
        }
      }
    }
    loadDetails()
    return () => {
      isMounted = false
    }
  }, [dramaId])

  // Get current status from single source of truth
  const currentStatus = getDramaStatus(dramaId) || (drama as any).status || null

  const handleStatusChange = async (newStatus: DramaStatus) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}

    // Toggle off if already active, or switch status
    const targetStatus = currentStatus === newStatus ? null : newStatus
    await updateDramaStatus(drama, targetStatus)
  }

  const title = drama.title || 'Untitled Drama'
  const nativeTitle = (drama as any).native_title || (drama as any).nativeTitle
  const posterUrl = (drama as any).poster_url || (drama as any).posterUrl || (drama as any).backdrop_url || (drama as any).backdropUrl
  const year = (drama as any).release_year || (drama as any).releaseYear
  const totalEpisodes = (drama as any).total_episodes || (drama as any).totalEpisodes
  const country = (drama as any).country
  const score = (drama as any).score || (drama as any).rating || (drama as any).userRating
  const overview = (drama as any).overview
  const cast = (drama as any).cast || []
  const genres = (drama as any).genres || []
  const vibe = (drama as any).vibe

  return (
    <View style={styles.container}>
      {/* Back Button Floating on Top */}
      <TouchableOpacity
        style={[styles.floatingBackBtn, { top: insets.top + 8 }]}
        onPress={() => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          } catch {}
          onBack()
        }}
        activeOpacity={0.8}
        accessibilityLabel="Go Back"
      >
        <ChevronLeft size={24} color="#ffffff" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Hero Poster with Gradient Fade */}
        <View style={styles.heroWrapper}>
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={styles.heroImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.heroPlaceholder} />
          )}

          {/* Gradient Bottom Fade to Background #050507 */}
          <LinearGradient
            colors={['transparent', 'rgba(5, 5, 7, 0.4)', 'rgba(5, 5, 7, 0.85)', '#050507']}
            locations={[0, 0.5, 0.8, 1]}
            style={styles.heroGradient}
          />

          {/* Title on Hero */}
          <View style={styles.heroInfo}>
            <Text style={styles.titleText}>{title}</Text>
            {nativeTitle ? <Text style={styles.nativeTitleText}>{nativeTitle}</Text> : null}
          </View>
        </View>

        {/* Drama Metadata Pills */}
        <View style={styles.metadataRow}>
          {year ? (
            <View style={styles.metaPill}>
              <Calendar size={13} color="#94a3b8" />
              <Text style={styles.metaText}>{year}</Text>
            </View>
          ) : null}

          {totalEpisodes ? (
            <View style={styles.metaPill}>
              <Film size={13} color="#94a3b8" />
              <Text style={styles.metaText}>{totalEpisodes} Eps</Text>
            </View>
          ) : null}

          {country ? (
            <View style={styles.metaPill}>
              <Globe size={13} color="#94a3b8" />
              <Text style={styles.metaText}>{country}</Text>
            </View>
          ) : null}

          {score ? (
            <View style={[styles.metaPill, styles.scorePill]}>
              <Star size={13} color="#facc15" fill="#facc15" />
              <Text style={styles.scoreText}>{Number(score).toFixed(1)}</Text>
            </View>
          ) : null}
        </View>

        {/* 3-Button Status Switcher: [ Watchlist ] [ Watching ] [ Finished ] */}
        <View style={styles.statusSwitcherWrapper}>
          <Text style={styles.sectionHeaderLabel}>TRACK STATUS</Text>
          <View style={styles.statusButtonGroup}>
            <TouchableOpacity
              style={[
                styles.statusBtn,
                currentStatus === 'watchlist' && styles.statusBtnActiveWatchlist,
              ]}
              onPress={() => handleStatusChange('watchlist')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  currentStatus === 'watchlist' && styles.statusBtnTextActive,
                ]}
              >
                Watchlist
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBtn,
                currentStatus === 'watching' && styles.statusBtnActiveWatching,
              ]}
              onPress={() => handleStatusChange('watching')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  currentStatus === 'watching' && styles.statusBtnTextActive,
                ]}
              >
                Watching
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBtn,
                currentStatus === 'finished' && styles.statusBtnActiveFinished,
              ]}
              onPress={() => handleStatusChange('finished')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  currentStatus === 'finished' && styles.statusBtnTextActive,
                ]}
              >
                Finished
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vibe / Genre Badges */}
        {vibe && (
          <View style={styles.vibeCard}>
            <Sparkles size={16} color="#c084fc" />
            <Text style={styles.vibeText}>
              Vibe: <Text style={styles.vibeHighlight}>{vibe.label || 'Masterclass'}</Text>
            </Text>
          </View>
        )}

        {genres.length > 0 && (
          <View style={styles.genresRow}>
            {genres.map((g: any, i: number) => (
              <View key={`genre-${i}`} style={styles.genrePill}>
                <Text style={styles.genreText}>{typeof g === 'string' ? g : g.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Synopsis / Overview */}
        {overview ? (
          <View style={styles.overviewContainer}>
            <Text style={styles.sectionHeading}>Synopsis</Text>
            <Text style={styles.overviewText}>{overview}</Text>
          </View>
        ) : detailLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#a855f7" />
          </View>
        ) : null}

        {/* Cast Members */}
        {cast.length > 0 && (
          <View style={styles.castSection}>
            <Text style={styles.sectionHeading}>Top Cast</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.castList}
            >
              {cast.slice(0, 10).map((member: any, i: number) => (
                <View key={`cast-${i}`} style={styles.castCard}>
                  {member.profileUrl ? (
                    <Image
                      source={{ uri: member.profileUrl }}
                      style={styles.castAvatar}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.castPlaceholder} />
                  )}
                  <Text style={styles.castName} numberOfLines={1}>
                    {member.name}
                  </Text>
                  {member.character ? (
                    <Text style={styles.castRole} numberOfLines={1}>
                      {member.character}
                    </Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
  },
  floatingBackBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  heroWrapper: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: 'relative',
    backgroundColor: '#0c0c12',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    backgroundColor: '#12121a',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT * 0.7,
  },
  heroInfo: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  nativeTitleText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 3,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  scorePill: {
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderColor: 'rgba(250, 204, 21, 0.25)',
  },
  scoreText: {
    color: '#facc15',
    fontSize: 12,
    fontWeight: '800',
  },
  statusSwitcherWrapper: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionHeaderLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  statusButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnActiveWatchlist: {
    backgroundColor: '#d97706',
    borderColor: '#f59e0b',
  },
  statusBtnActiveWatching: {
    backgroundColor: '#0d9488',
    borderColor: '#14b8a6',
  },
  statusBtnActiveFinished: {
    backgroundColor: '#7c3aed',
    borderColor: '#a855f7',
  },
  statusBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  statusBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  vibeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  vibeText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  vibeHighlight: {
    color: '#c084fc',
    fontWeight: '800',
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  genrePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  genreText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  overviewContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeading: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  overviewText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  castSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  castList: {
    paddingTop: 8,
    gap: 12,
  },
  castCard: {
    width: 80,
    alignItems: 'center',
  },
  castAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1a1a24',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  castPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1a1a24',
  },
  castName: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  castRole: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'center',
  },
})
