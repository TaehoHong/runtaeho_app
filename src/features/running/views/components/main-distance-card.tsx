import React from 'react';
import { GREY } from '~/shared/styles';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Text } from '~/shared/components/typography';
import { useRunning } from '~/features/running/contexts';

interface MainDistanceCardProps {
  distanceMeters?: number;
}

/**
 * 현재 누적 거리 카드
 * "현재 누적 거리" + "00.0 km"
 */
export const MainDistanceCard: React.FC<MainDistanceCardProps> = ({ distanceMeters }) => {
  const { distance } = useRunning();
  const resolvedDistance = distanceMeters ?? distance;

  // 내부 데이터는 1m 단위를 유지하고, UI 표시는 0.01km 단위로만 반올림한다.
  const distanceKm = (Math.max(0, resolvedDistance) / 1000).toFixed(2);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>현재 누적 거리</Text>
      <View style={styles.distanceContainer}>
        <Text style={styles.distanceValue}>{distanceKm}</Text>
        <Text style={styles.distanceUnit}>km</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    width: '100%'
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
    color: GREY[500],
    marginBottom: 16,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  distanceValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -1,
  },
  distanceUnit: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000000',
  },
});
