import React from 'react';
import { GREY } from '~/shared/styles';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Text } from '~/shared/components/typography';
import { useRunning } from '~/features/running/contexts';

/**
 * 페이스 타입
 * - instant: 순간 페이스 (최근 10초 기준) - RunningActive에서 사용
 * - average: 전체 평균 페이스 (시작~현재) - RunningPaused, RunningFinished에서 사용
 */
type PaceType = 'instant' | 'average';

interface StatsViewProps {
  /**
   * 표시할 페이스 타입
   * @default 'average'
   */
  paceType?: PaceType;
}

/**
 * 러닝 통계 뷰 (피그마 디자인 기반)
 * BPM, 페이스, 러닝 시간 표시
 *
 * 정책: 센서 데이터 없으면 "--" 표시
 */
export const StatsView: React.FC<StatsViewProps> = ({ paceType = 'average' }) => {
  const { elapsedTime, stats } = useRunning();

  // 러닝 시간 포맷팅 (MM:SS)
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 정책: undefined 또는 null이면 "--" 표시
  const bpm = stats.bpm !== undefined && stats.bpm !== null
    ? String(stats.bpm).padStart(2, '0')
    : '--';

  // 페이스 타입에 따라 순간/평균 페이스 선택
  const paceData = paceType === 'instant' ? stats.instantPace : stats.pace;
  // 순간 페이스가 0인 경우 (아직 계산 안됨) "--" 표시
  const pace = paceData.totalSeconds === 0
    ? '--:--'
    : `${String(paceData.minutes).padStart(2, '0')}:${String(paceData.seconds).padStart(2, '0')}`;
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
    paddingVertical: 12,
    paddingHorizontal: 0,
    flex: 1
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400', // Figma: Pretendard SemiBold
    color: GREY[500],
    marginBottom: 6,
  },
  statValue: {
    fontSize: 27,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.5,
  },
});