import React from 'react';
import { GREY } from '~/shared/styles';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Text } from '~/shared/components/typography';
import { useRunning } from '../contexts';
import { RunningStatusFormat } from '~/shared/utils/formatters';

interface StatItemProps {
  title: string;
  subtitle: string;
}

interface DetailedStatisticsCardProps {
  distanceMeters?: number;
  durationSec?: number;
  heartRate?: number | null;
}

const StateItemCompactView: React.FC<StatItemProps> = ({ title, subtitle }) => {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
};

export const DetailedStatisticsCard: React.FC<DetailedStatisticsCardProps> = ({
  distanceMeters,
  durationSec,
  heartRate,
}) => {
  const { currentRecord } = useRunning();
  const resolvedDistance = distanceMeters ?? currentRecord?.distance;
  const resolvedDurationSec = durationSec ?? currentRecord?.durationSec;
  const resolvedHeartRate = heartRate ?? currentRecord?.heartRate;

  // 러닝 종료 후 데이터가 없으면 기본값 표시
  if (resolvedDistance == null || resolvedDurationSec == null) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <StateItemCompactView title="--" subtitle="심박" />
          <StateItemCompactView title={RunningStatusFormat.pace(null)} subtitle="페이스" />
          <StateItemCompactView title={RunningStatusFormat.duration(null)} subtitle="러닝 시간" />
        </View>
      </View>
    );
  }

  const heartRateText = RunningStatusFormat.heartRate(resolvedHeartRate);
  const paceText = RunningStatusFormat.paceFromMetersAndSeconds(
    resolvedDistance,
    resolvedDurationSec
  );
  const timeText = RunningStatusFormat.duration(resolvedDurationSec);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <StateItemCompactView
          title={heartRateText}
          subtitle="심박"
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
