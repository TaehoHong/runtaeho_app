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
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );
};

export const DetailedStatisticsCard: React.FC = () => {
  // TODO: RunningFinishedViewModel에서 통계 데이터 가져오기
  const timeText = '00:00:00';
  const calorieText = '0';
  const heartRateText = '0';
  const paceText = '0\'00"';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <StateItemCompactView
          title={timeText}
          subtitle="시간"
        />

        <StateItemCompactView
          title={calorieText}
          subtitle="칼로리"
        />
      </View>

      <View style={styles.row}>
        <StateItemCompactView
          title={heartRateText}
          subtitle="심박수"
        />

        <StateItemCompactView
          title={paceText}
          subtitle="페이스"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    gap: 3,
  },
  statTitle: {
    fontSize: 30,
    fontWeight: '600',
    color: '#000000',
  },
  statSubtitle: {
    fontSize: 18,
    color: '#666666',
  },
});