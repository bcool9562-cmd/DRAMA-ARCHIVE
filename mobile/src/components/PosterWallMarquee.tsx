import React, { useEffect, useRef } from 'react'
import { View, FlatList, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { Image } from 'expo-image'
import * as Haptics from 'expo-haptics'
import { Drama, ArchiveItem } from '../types'

interface PosterWallMarqueeProps {
  dramas: Drama[]
  onPressDrama: (drama: Drama | ArchiveItem) => void
}

const ITEM_WIDTH = 110
const ITEM_HEIGHT = 160
const ITEM_GAP = 10

export const PosterWallMarquee: React.FC<PosterWallMarqueeProps> = ({ dramas, onPressDrama }) => {
  const flatListRef = useRef<FlatList<any>>(null)
  const offsetRef = useRef<number>(0)

  // Double items for seamless infinite horizontal scroll
  const displayItems = [...dramas, ...dramas, ...dramas]

  useEffect(() => {
    if (dramas.length === 0) return

    const interval = setInterval(() => {
      if (!flatListRef.current) return
      offsetRef.current += 1.2
      const maxOffset = dramas.length * (ITEM_WIDTH + ITEM_GAP)
      if (offsetRef.current >= maxOffset) {
        offsetRef.current = 0
      }
      flatListRef.current.scrollToOffset({
        offset: offsetRef.current,
        animated: false,
      })
    }, 30)

    return () => clearInterval(interval)
  }, [dramas.length])

  if (dramas.length === 0) return null

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={displayItems}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => `marquee-${index}`}
        scrollEnabled={true}
        getItemLayout={(_, index) => ({
          length: ITEM_WIDTH + ITEM_GAP,
          offset: (ITEM_WIDTH + ITEM_GAP) * index,
          index,
        })}
        renderItem={({ item }) => {
          const posterUrl = item.posterUrl || (item as any).poster_url
          return (
            <TouchableOpacity
              style={styles.posterCard}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                } catch {}
                onPressDrama(item)
              }}
              activeOpacity={0.8}
            >
              {posterUrl ? (
                <Image
                  source={{ uri: posterUrl }}
                  style={styles.posterImage}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.placeholder} />
              )}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT + 16,
    marginVertical: 8,
  },
  posterCard: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    marginRight: ITEM_GAP,
    overflow: 'hidden',
    backgroundColor: '#16161f',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#1e1e2d',
  },
})
