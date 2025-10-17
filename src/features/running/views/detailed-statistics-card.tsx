import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Text } from '~/shared/components/typography';

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
  // TODO: RunningFinishedViewModel에서 통계 데이터 가져오기
  const heartRateText = '00'; // BPM
  const paceText = '00:00'; // 페이스
  const timeText = '00:51'; // 러닝 시간

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
    paddingHorizontal: 16,
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
    color: '#666666',
  },
  statTitle: {
    fontSize: 27,
    fontWeight: '600',
    color: '#000000',
  },
});