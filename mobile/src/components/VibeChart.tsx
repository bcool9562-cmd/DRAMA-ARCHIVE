import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { G, Circle, Text as SvgText } from 'react-native-svg'
import { useArchive } from '../context/ArchiveContext'

const CHART_SIZE = 160
const STROKE_WIDTH = 18
const RADIUS = (CHART_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export const VibeChart: React.FC = () => {
  const { watchlist, watching, finished, archive } = useArchive()

  const total = archive.length

  const countFinished = finished.length
  const countWatching = watching.length
  const countWatchlist = watchlist.length

  // Calculate percentages (fall back to default sample if total == 0)
  const pctFinished = total > 0 ? countFinished / total : 0.4
  const pctWatching = total > 0 ? countWatching / total : 0.35
  const pctWatchlist = total > 0 ? countWatchlist / total : 0.25

  // Arc stroke dash calculations
  const strokeFinished = CIRCUMFERENCE * pctFinished
  const strokeWatching = CIRCUMFERENCE * pctWatching
  const strokeWatchlist = CIRCUMFERENCE * pctWatchlist

  // Offsets for sequential donut segments
  const offsetFinished = 0
  const offsetWatching = -strokeFinished
  const offsetWatchlist = -(strokeFinished + strokeWatching)

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Vibe Chart</Text>
        <Text style={styles.cardSubtitle}>Archive Pulse</Text>
      </View>

      <View style={styles.chartRow}>
        <View style={styles.svgWrapper}>
          <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}>
            <G rotation="-90" origin={`${CHART_SIZE / 2}, ${CHART_SIZE / 2}`}>
              {/* Background Track */}
              <Circle
                cx={CHART_SIZE / 2}
                cy={CHART_SIZE / 2}
                r={RADIUS}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />

              {/* Finished (Purple) */}
              {strokeFinished > 0 && (
                <Circle
                  cx={CHART_SIZE / 2}
                  cy={CHART_SIZE / 2}
                  r={RADIUS}
                  stroke="#8b5cf6"
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${strokeFinished} ${CIRCUMFERENCE}`}
                  strokeDashoffset={offsetFinished}
                  strokeLinecap="round"
                  fill="none"
                />
              )}

              {/* Watching (Teal) */}
              {strokeWatching > 0 && (
                <Circle
                  cx={CHART_SIZE / 2}
                  cy={CHART_SIZE / 2}
                  r={RADIUS}
                  stroke="#0d9488"
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${strokeWatching} ${CIRCUMFERENCE}`}
                  strokeDashoffset={offsetWatching}
                  strokeLinecap="round"
                  fill="none"
                />
              )}

              {/* Watchlist (Amber) */}
              {strokeWatchlist > 0 && (
                <Circle
                  cx={CHART_SIZE / 2}
                  cy={CHART_SIZE / 2}
                  r={RADIUS}
                  stroke="#f59e0b"
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${strokeWatchlist} ${CIRCUMFERENCE}`}
                  strokeDashoffset={offsetWatchlist}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </G>

            {/* Center Label */}
            <SvgText
              x={CHART_SIZE / 2}
              y={CHART_SIZE / 2 - 4}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="24"
              fontWeight="900"
            >
              {total}
            </SvgText>
            <SvgText
              x={CHART_SIZE / 2}
              y={CHART_SIZE / 2 + 16}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="10"
              fontWeight="600"
              letterSpacing="1"
            >
              DRAMAS
            </SvgText>
          </Svg>
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
            <View style={styles.legendTextCol}>
              <Text style={styles.legendLabel}>Finished</Text>
              <Text style={styles.legendValue}>
                {countFinished} <Text style={styles.legendPct}>({Math.round(pctFinished * 100)}%)</Text>
              </Text>
            </View>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#0d9488' }]} />
            <View style={styles.legendTextCol}>
              <Text style={styles.legendLabel}>Watching</Text>
              <Text style={styles.legendValue}>
                {countWatching} <Text style={styles.legendPct}>({Math.round(pctWatching * 100)}%)</Text>
              </Text>
            </View>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <View style={styles.legendTextCol}>
              <Text style={styles.legendLabel}>Watchlist</Text>
              <Text style={styles.legendValue}>
                {countWatchlist} <Text style={styles.legendPct}>({Math.round(pctWatchlist * 100)}%)</Text>
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: '600',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    gap: 12,
    marginLeft: 16,
    flex: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendTextCol: {
    flex: 1,
  },
  legendLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  legendValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  legendPct: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
})
