/**
 * Running Record List Component (Infinite Scroll)
 *
 */

import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator,} from 'react-native';
import { EmptyState } from '../components/EmptyState';
import type { RunningRecord } from '../../../running/models';
import { formatDuration, calculateAveragePace } from '../../../running/models';
import { useRunningRecordList } from '../../viewmodels/useRunningRecordList';

interface RunningRecordListProps {
}

export const RunningRecordList: React.FC<RunningRecordListProps> = () => {
  // Hook에서 모든 비즈니스 로직 및 상태 관리
  const {
    records,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useRunningRecordList();

  // 로딩 상태
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color="#45DA31" />
      </View>
    );
  }

  // 에러 상태
  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>기록을 불러올 수 없습니다</Text>
      </View>
    );
  }

  // 빈 리스트
  if (records.length === 0) {
    return (
      <EmptyState message="러닝을 시작하면 기록이 생겨요!" />
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <RunningRecordCard record={item} />}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#45DA31" />
            </View>
          ) : null
        }
        scrollEnabled={false} // 상위 ScrollView와 충돌 방지
        nestedScrollEnabled
      />
    </View>
  );
};

/**
 * Running Record Card Component
 * Figma: Frame 637910 (0, 0, 335x94)
 */
interface RunningRecordCardProps {
  record: RunningRecord;
}

const RunningRecordCard: React.FC<RunningRecordCardProps> = ({ record }) => {
  // 날짜 포맷팅
  const recordDate = new Date(record.startTimestamp * 1000);
  const dateString = `${recordDate.getFullYear()}년 ${recordDate.getMonth() + 1}월 ${recordDate.getDate()}일 ${String(recordDate.getHours()).padStart(2, '0')}:${String(recordDate.getMinutes()).padStart(2, '0')}`;

  // 통계 데이터
  const distance = `${(record.distance / 1000).toFixed(2)} km`;
  const pace = calculateAveragePace(record);
  const paceFormatted = `${Math.floor(pace)}:${String(Math.floor((pace % 1) * 60)).padStart(2, '0')}"/km`;
  const duration = formatDuration(record.durationSec);

  return (
    <View style={styles.card}>
      {/* 날짜/시간 */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{dateString}</Text>
      </View>

      {/* 통계 정보 */}
      <View style={styles.cardStats}>
        {/* 거리 */}
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{distance}</Text>
          <Text style={styles.statLabel}>거리</Text>
        </View>

        {/* 페이스 */}
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{paceFormatted}</Text>
          <Text style={styles.statLabel}>페이스</Text>
        </View>

        {/* 총 시간 */}
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{duration}</Text>
          <Text style={styles.statLabel}>총 시간</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 10,
  },
  centerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#9D9D9D',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  card: {
    marginBottom: 10,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  cardHeader: {
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9D9D9D',
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 7,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202020',
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9D9D9D',
    lineHeight: 16,
  },
});
