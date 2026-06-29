/**
 * Statistics Summary Card Component
 * Figma: Frame 637886 (20, 445, 335x70)
 *
 * 선택 기간의 총 거리를 대표 지표로 표시:
 * - 총 거리 (km)
 * - 러닝 횟수
 * - 평균 페이스
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Period } from '../../models';
import { PRIMARY, GREY } from '~/shared/styles';
import { RunningStatusFormat } from '~/shared/utils/formatters';

interface StatisticsSummaryCardProps {
  runCount: number;
  totalDistance: number; // 미터 단위
  averagePace: number; // 초/미터 또는 분/km
  period: Period;
}

const getDistanceLabel = (period: Period) => {
  switch (period) {
    case Period.WEEK:
      return '이번 주 총 거리';
    case Period.YEAR:
      return '올해 총 거리';
    case Period.MONTH:
    default:
      return '이번 달 총 거리';
  }
};

export const StatisticsSummaryCard: React.FC<StatisticsSummaryCardProps> = ({
  runCount,
  totalDistance,
  averagePace,
  period,
}) => {
  const distance = RunningStatusFormat.distanceParts(totalDistance);
  const pace = RunningStatusFormat.pace(averagePace);

  return (
    <View style={styles.container}>
      <View style={styles.accent} />
      <Text style={styles.label}>{getDistanceLabel(period)}</Text>
      <View
        style={styles.distanceRow}
        accessible
        accessibilityLabel={distance.text}
      >
        <Text
          style={styles.distanceValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
        >
          {distance.value}
        </Text>
        <Text style={styles.distanceUnit}>{distance.unit}</Text>
      </View>

      <View style={styles.secondaryRow}>
        <View style={styles.secondaryItem}>
          <Text style={styles.secondaryLabel}>러닝</Text>
          <Text style={styles.secondaryValue}>{runCount}회</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.secondaryItem}>
          <Text style={styles.secondaryLabel}>평균 페이스</Text>
          <Text style={styles.secondaryValue}>{pace}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: GREY.WHITE,
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  accent: {
    width: 28,
    height: 4,
    marginBottom: 12,
    borderRadius: 2,
    backgroundColor: PRIMARY[600],
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: GREY[500],
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  distanceValue: {
    flexShrink: 1,
    fontSize: 52,
    lineHeight: 60,
    fontWeight: '800',
    color: GREY[900],
  },
  distanceUnit: {
    marginLeft: 8,
    marginBottom: 8,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: GREY[900],
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: GREY[100],
  },
  secondaryItem: {
    flex: 1,
  },
  secondaryLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: GREY[500],
  },
  secondaryValue: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: GREY[900],
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    marginHorizontal: 16,
    backgroundColor: GREY[100],
  },
});
