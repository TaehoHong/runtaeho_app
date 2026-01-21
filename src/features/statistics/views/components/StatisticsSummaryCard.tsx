/**
 * Statistics Summary Card Component
 * Figma: Frame 637886 (20, 445, 335x70)
 *
 * 3개의 독립적인 카드로 통계 정보 표시:
 * - 러닝 (횟수)
 * - 총 거리 (km)
 * - 페이스 (시:분:초)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GREY } from '~/shared/styles';
import { formatPaceForUI } from '~/shared/utils/formatters';

interface StatisticsSummaryCardProps {
  runCount: number;
  totalDistance: number; // 미터 단위
  averagePace: number; // 초/미터 또는 분/km
}

export const StatisticsSummaryCard: React.FC<StatisticsSummaryCardProps> = ({
  runCount,
  totalDistance,
  averagePace,
}) => {
  // 거리를 km로 변환
  const distanceInKm = (totalDistance / 1000).toFixed(2);


  return (
    <View style={styles.container}>
      {/* 러닝 횟수 카드 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>러닝</Text>
        <Text style={styles.cardValue}>{runCount}</Text>
      </View>

      {/* 총 거리 카드 */}
      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Text style={styles.cardLabel}>총 거리</Text>
          <Text style={styles.cardLabelUnit}>(km)</Text>
        </View>
        <Text style={styles.cardValue}>{distanceInKm} km</Text>
      </View>

      {/* 페이스 카드 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>페이스</Text>
        <Text style={styles.cardValue}>{formatPaceForUI(averagePace)}"/km</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 10,
    gap: 10,
  },
  card: {
    flex: 1,
    height: 70,
    padding: 16,
    backgroundColor: GREY.WHITE,
    borderRadius: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: GREY[300],
    marginBottom: 6,
  },
  cardLabelUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: GREY[200],
    marginLeft: 2,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY[900],
  },
});
