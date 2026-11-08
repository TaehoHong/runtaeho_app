import { useAppTranslation } from '~/i18n';
/**
 * Running Record Card Component
 * 개별 러닝 기록 카드
 */

import React, { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import type { RunningRecord } from '../../../running/models';
import { formatDuration, calculateAveragePace } from '../../../running/models';
import { formatRecordDate } from '~/shared/utils/dateUtils';
import { RunningStatusFormat } from '~/shared/utils/formatters';
import { GREY } from '~/shared/styles';
import { getNumberFontStyle } from '~/shared/components/typography/fontUtils';
import { getRunningRecordSourceLabel, RunningRecordSource } from '~/features/running/views/components/RunningRecordSource';

interface RunningRecordCardProps {
  record: RunningRecord;
}

const RunningRecordCardComponent: React.FC<RunningRecordCardProps> = ({ record }) => {
  const t = useAppTranslation();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale > 1.3;
  const dateString = formatRecordDate(record.startTimestamp, t);
  const distance = RunningStatusFormat.distance(record.distance);
  const pace = calculateAveragePace(record);
  const paceFormatted = RunningStatusFormat.pace(pace);
  const duration = formatDuration(record.durationSec);
  const sourceLabel = getRunningRecordSourceLabel(record, t);

  // 배율 복귀 시 Android에 이전 글자 측정값이 남지 않도록 표시 루트를 갱신한다.
  return (
    <TouchableOpacity
      key={fontScale}
      style={styles.card}
      activeOpacity={0.8}
      onPress={() =>
        router.push({
          pathname: '/running-record-detail' as const,
          params: { id: String(record.id) },
        } as any)
      }
      accessibilityRole="button"
      accessibilityLabel={`${dateString}, ${t("거리")} ${distance}, ${t("페이스")} ${paceFormatted}, ${t("총 시간")} ${duration}${sourceLabel ? `, ${sourceLabel}` : ''}`}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{dateString}</Text>
      </View>

      <View style={[styles.cardStats, stacked && styles.cardStatsStacked]}>
        <View style={[styles.statBox, stacked && styles.statBoxStacked]}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{distance}</Text>
        </View>

        <View style={[styles.statBox, styles.paceBox, stacked && styles.statBoxStacked]}>
          <Ionicons name="speedometer-outline" size={14} color={GREY[700]} accessible={false} />
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{paceFormatted}</Text>
        </View>

        <View style={[styles.statBox, styles.durationBox, stacked && styles.statBoxStacked]}>
          <Ionicons name="timer-outline" size={14} color={GREY[700]} accessible={false} />
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{duration}</Text>
        </View>
      </View>
      <RunningRecordSource record={record} />
    </TouchableOpacity>
  );
};

export const RunningRecordCard = memo(RunningRecordCardComponent);

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: GREY.WHITE,
    borderRadius: 8,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 12,
    ...getNumberFontStyle('500'),
    color: GREY[700],
    lineHeight: 17,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flexGrow: 1,
    width: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  paceBox: { flexGrow: 1.25 },
  durationBox: { flexGrow: 0.9 },
  cardStatsStacked: {
    flexDirection: 'column',
    gap: 16,
  },
  statBoxStacked: {
    flexGrow: 0,
    width: '100%',
  },
  statValue: {
    flexShrink: 1,
    fontSize: 16,
    ...getNumberFontStyle('600'),
    color: GREY[900],
    lineHeight: 24,
  },
});
