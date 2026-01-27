/**
 * Running Record Card Component
 * 개별 러닝 기록 카드
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RunningRecord } from '../../../running/models';
import { formatDuration, calculateAveragePace } from '../../../running/models';
import { formatRecordDate } from '~/shared/utils/dateUtils';
import { formatPaceForUI } from '~/shared/utils/formatters';
import { GREY } from '~/shared/styles';

interface RunningRecordCardProps {
  record: RunningRecord;
}

const RunningRecordCardComponent: React.FC<RunningRecordCardProps> = ({ record }) => {
  const dateString = formatRecordDate(record.startTimestamp);
  const distance = `${(record.distance / 1000).toFixed(2)} km`;
  const pace = calculateAveragePace(record);
  const paceFormatted = `${formatPaceForUI(pace)}"/km`;
  const duration = formatDuration(record.durationSec);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{dateString}</Text>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{distance}</Text>
          <Text style={styles.statLabel}>거리</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statValue}>{paceFormatted}</Text>
          <Text style={styles.statLabel}>페이스</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statValue}>{duration}</Text>
          <Text style={styles.statLabel}>총 시간</Text>
        </View>
      </View>
    </View>
  );
};

export const RunningRecordCard = memo(RunningRecordCardComponent);

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 0,
    backgroundColor: GREY.WHITE,
    borderRadius: 8,
  },
  cardHeader: {
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '500',
    color: GREY[500],
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: GREY[900],
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: GREY[500],
    lineHeight: 16,
  },
});
