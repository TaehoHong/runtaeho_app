import React from 'react';
import { GREY } from '~/shared/styles';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Text } from '~/shared/components/typography';
import { useRunning } from '../contexts';

interface StatItemProps {
  title: string;
  subtitle: string;
}

const StateItemCompactView: React.FC<StatItemProps> = ({ title, subtitle }) => {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
};

export const DetailedStatisticsCard: React.FC = () => {
  const { lastEndedRecord, formatElapsedTime, formatBpm, formatPace } = useRunning();

  // 러닝 종료 후 데이터가 없으면 기본값 표시
  if (!lastEndedRecord) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <StateItemCompactView title="--" subtitle="BPM" />
          <StateItemCompactView title="--:--" subtitle="페이스" />
          <StateItemCompactView title="--:--" subtitle="러닝 시간" />
        </View>
      </View>
    );
  }

  // 심박수 포맷팅
  const heartRateText = formatBpm(lastEndedRecord.heartRate > 0 ? lastEndedRecord.heartRate : undefined);

  // 페이스 계산 및 포맷팅 (분:초/km)
  const paceSeconds = lastEndedRecord.distance > 0
    ? Math.floor((lastEndedRecord.durationSec / lastEndedRecord.distance) * 1000)
    : 0;
  const paceMinutes = Math.floor(paceSeconds / 60);
  const paceSecondsRemainder = paceSeconds % 60;
  const paceText = formatPace(paceMinutes, paceSecondsRemainder);

  // 러닝 시간 포맷팅 (분:초)
  const timeText = formatElapsedTime(lastEndedRecord.durationSec);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <StateItemCompactView
          title={heartRateText}
          subtitle="BPM"
        />

        <StateItemCompactView
          title={paceText}
          subtitle="페이스"
        />

        <StateItemCompactView
          title={timeText}
          subtitle="러닝 시간"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  statSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: GREY[700],
  },
  statTitle: {
    fontSize: 27,
    fontWeight: '600',
    color: '#000000',
  },
});