import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import { ArchiveItem, Drama } from '../types'

interface DramaCardProps {
  drama: Drama | ArchiveItem
  onPress: (drama: Drama | ArchiveItem) => void
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 12) / 2
const POSTER_HEIGHT = CARD_WIDTH * 1.48

export const DramaCard: React.FC<DramaCardProps> = ({ drama, onPress }) => {
  const title = drama.title || 'Untitled Drama'
  const posterUrl = (drama as any).poster_url || (drama as any).posterUrl || ''
  const status = drama.status
  const score = (drama as any).rating || (drama as any).userRating || (drama as any).score
  const year = (drama as any).release_year || (drama as any).releaseYear
  const country = (drama as any).country

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
    onPress(drama)
  }

  const getStatusBadge = () => {
    if (!status) return null
    if (status === 'watching') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(13, 148, 136, 0.85)' }]}>
          <Text style={styles.statusText}>Watching</Text>
        </View>
      )
    }
    if (status === 'finished') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(124, 58, 237, 0.85)' }]}>
          <Text style={styles.statusText}>Finished</Text>
        </View>
      )
    }
    return (
      <View style={[styles.statusBadge, { backgroundColor: 'rgba(217, 119, 6, 0.85)' }]}>
        <Text style={styles.statusText}>Watchlist</Text>
      </View>
    )
  }

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.posterWrapper}>
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={styles.posterImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.placeholderPoster}>
            <Text style={styles.placeholderText}>SCENOVA</Text>
          </View>
        )}

        {getStatusBadge()}

        {score ? (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>★ {Number(score).toFixed(1)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metaContainer}>
        <Text style={styles.titleText} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.detailsRow}>
          {year ? <Text style={styles.detailsText}>{year}</Text> : null}
          {year && country ? <Text style={styles.dotSeparator}>•</Text> : null}
          {country ? <Text style={styles.detailsText}>{country}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  posterWrapper: {
    width: CARD_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#121217',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  placeholderPoster: {
    flex: 1,
    backgroundColor: '#1a1a24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#64748b',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backdropFilter: 'blur(8px)',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scoreBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreText: {
    color: '#facc15',
    fontSize: 10,
    fontWeight: '800',
  },
  metaContainer: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  titleText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  detailsText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  dotSeparator: {
    color: '#64748b',
    marginHorizontal: 4,
    fontSize: 10,
  },
})
