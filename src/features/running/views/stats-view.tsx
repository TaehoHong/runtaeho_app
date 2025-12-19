import React from 'react';
import { GREY } from '~/shared/styles';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Text } from '~/shared/components/typography';
import { useRunning } from '~/features/running/contexts';

/**
 * 러닝 통계 뷰 (피그마 디자인 기반)
 * BPM, 페이스, 러닝 시간 표시
 *
 * 정책: 센서 데이터 없으면 "--" 표시
 */
export const StatsView: React.FC = () => {
  const { elapsedTime, stats } = useRunning();

  // 러닝 시간 포맷팅 (MM:SS)
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Figma 디자인: 센서 데이터 없으면 "00" 표시
  const bpm = stats.bpm !== undefined && stats.bpm !== null
    ? String(stats.bpm).padStart(2, '0')
    : '00';
  const pace = `${String(stats.pace.minutes).padStart(2, '0')}:${String(stats.pace.seconds).padStart(2, '0')}`;
  const runningTime = formatElapsedTime(elapsedTime);

  return (
    <View style={styles.container}>
      {/* BPM */}
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>BPM</Text>
        <Text style={styles.statValue}>{bpm}</Text>
      </View>

      {/* 페이스 */}
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>페이스</Text>
        <Text style={styles.statValue}>{pace}</Text>
      </View>

      {/* 러닝 시간 */}
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>러닝 시간</Text>
        <Text style={styles.statValue}>{runningTime}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    flex: 1,
    backgroundColor: GREY.WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600', // Figma: Pretendard SemiBold
    color: GREY[500],
    marginBottom: 8,
  },
  statValue: {
    fontSize: 27,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.5,
  },
});