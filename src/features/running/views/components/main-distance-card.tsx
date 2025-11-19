import React from 'react';
import { GREY } from '~/shared/styles';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Text } from '~/shared/components/typography';
import { useRunning } from '~/features/running/contexts';

/**
 * 현재 누적 거리 카드
 * Figma 디자인 기반: "현재 누적 거리" + "00.0 km"
 */
export const MainDistanceCard: React.FC = () => {
  const { distance } = useRunning();

  // 거리를 km 단위로 변환 (distance는 미터 단위)
  const distanceKm = (distance / 1000).toFixed(2);

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
    width: '100%',
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