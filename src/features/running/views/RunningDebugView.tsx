import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRunningDebug } from '../hooks/useRunningDebug';

/**
 * 러닝 디버그 뷰
 * 러닝 세션 중 디버깅을 위한 데이터 표시
 * - GPS 추적 상태
 * - 센서 데이터
 * - 러닝 상태
 * - 세그먼트 추적
 * - 백그라운드/API 상태
 */
export const RunningDebugView: React.FC = () => {
  const {
    // GPS & Location
    trackingData,
    locations,

    // 센서 데이터
    stats,

    // 러닝 상태
    runningState,
    elapsedTime,
    distance,
    useBackgroundMode,
    appState,

    // 세그먼트
    currentSegmentItems,
    segmentCount,

    // API 상태
    isStarting,
    isEnding,
  } = useRunningDebug();

  const formatCoordinate = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '--';
    return value.toFixed(6);
  };

  const formatNumber = (value: number | undefined | null, decimals: number = 2) => {
    if (value === undefined || value === null) return '--';
    return value.toFixed(decimals);
  };

  return (
    <ScrollView style={styles.container}>
      {/* GPS 추적 상태 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 GPS 추적 상태</Text>
        <DebugRow
          label="현재 위치"
          value={
            trackingData?.currentLocation
              ? `${formatCoordinate(trackingData.currentLocation.latitude)}, ${formatCoordinate(trackingData.currentLocation.longitude)}`
              : '--'
          }
        />
        <DebugRow label="GPS 정확도" value={`${formatNumber(trackingData?.accuracy, 1)} m`} />
        <DebugRow label="현재 속도" value={`${formatNumber(trackingData?.currentSpeed, 2)} km/h`} />
        <DebugRow label="평균 속도" value={`${formatNumber(trackingData?.averageSpeed, 2)} km/h`} />
        <DebugRow
          label="GPS 추적 중"
          value={trackingData?.isTracking ? '✅ 활성' : '❌ 비활성'}
          highlight={trackingData?.isTracking ?? false}
        />
        <DebugRow label="수집된 위치" value={`${locations.length} 포인트`} />
      </View>

      {/* 센서 데이터 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💓 센서 데이터</Text>
        <DebugRow
          label="심박수 (BPM)"
          value={stats.bpm !== undefined ? `${stats.bpm}` : '센서 없음'}
          highlight={stats.bpm !== undefined}
        />
        <DebugRow
          label="심박수 소스"
          value="📋 Check Logs"
        />
        <DebugRow
          label="케이던스 (SPM)"
          value={stats.cadence !== undefined ? `${stats.cadence}` : '센서 없음'}
          highlight={stats.cadence !== undefined}
        />
        <DebugRow
          label="케이던스 소스"
          value="📋 Check Logs"
        />
      </View>

      {/* 러닝 상태 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏃 러닝 상태</Text>
        <DebugRow
          label="상태"
          value={runningState.toUpperCase()}
          highlight={runningState === 'running'}
        />
        <DebugRow label="경과 시간" value={`${elapsedTime} 초`} />
        <DebugRow label="거리" value={`${formatNumber(distance, 1)} m`} />
        <DebugRow
          label="백그라운드 모드"
          value={useBackgroundMode ? '✅ 사용' : '❌ 미사용'}
          highlight={!!useBackgroundMode}
        />
        <DebugRow
          label="앱 상태"
          value={appState.toUpperCase()}
          highlight={appState === 'active'}
        />
      </View>

      {/* 세그먼트 추적 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 세그먼트 추적</Text>
        <DebugRow label="생성된 세그먼트" value={`${segmentCount} 개`} />
        <DebugRow
          label="세그먼트 거리 임계값"
          value="10.0 m"
        />
        {currentSegmentItems.length > 0 && (() => {
          const lastSegment = currentSegmentItems[currentSegmentItems.length - 1];
          if (!lastSegment) return null;
          return (
            <DebugRow
              label="마지막 세그먼트"
              value={`ID: ${lastSegment.id}, ${formatNumber(lastSegment.distance, 1)} m`}
            />
          );
        })()}
      </View>

      {/* API 상태 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌐 API 상태</Text>
        <DebugRow
          label="러닝 시작 중"
          value={isStarting ? '⏳ 요청 중' : '✅ 완료'}
          highlight={!!isStarting}
        />
        <DebugRow
          label="러닝 종료 중"
          value={isEnding ? '⏳ 요청 중' : '✅ 완료'}
          highlight={!!isEnding}
        />
      </View>
    </ScrollView>
  );
};

interface DebugRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

const DebugRow: React.FC<DebugRowProps> = ({ label, value, highlight }) => {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, highlight && styles.valueHighlight]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 0,
  },
  section: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ff00',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  label: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  valueHighlight: {
    color: '#00ff00',
  },
});
