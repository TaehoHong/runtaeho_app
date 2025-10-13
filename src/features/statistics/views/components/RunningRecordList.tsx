/**
 * Running Record List Component (Infinite Scroll)
 * Figma: Frame 637915 (20, 539, 335x302)
 *
 * 러닝 기록 리스트를 무한 스크롤로 표시
 * TanStack Query (React Query)의 useInfiniteQuery 사용
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Period, getStartOfWeek, getStartOfMonth, getStartOfYear } from '../../models';
import type { RunningRecord } from '../../../running/models';
import { formatDuration, calculateAveragePace } from '../../../running/models';

interface RunningRecordListProps {
  period: Period;
}

// Mock API 함수 (실제로는 services에서 import)
const fetchRunningRecords = async ({
  cursor,
  size = 20,
  startTimestamp,
  endTimestamp,
}: {
  cursor?: number;
  size?: number;
  startTimestamp?: number;
  endTimestamp?: number;
}): Promise<{ contents: RunningRecord[]; nextCursor: number | null; hasNext: boolean }> => {
  // TODO: 실제 API 호출로 교체
  // return await runningService.getRunningRecords({ cursor, size, startTimestamp, endTimestamp });

  // Mock 데이터
  return {
    contents: [] as RunningRecord[],
    nextCursor: null,
    hasNext: false,
  };
};

export const RunningRecordList: React.FC<RunningRecordListProps> = ({ period }) => {
  // 기간에 따른 시작/종료 시간 계산
  const { startTimestamp, endTimestamp } = useMemo(() => {
    const now = new Date();
    let start: Date;

    switch (period) {
      case Period.WEEK:
        start = getStartOfWeek(now);
        break;
      case Period.MONTH:
        start = getStartOfMonth(now);
        break;
      case Period.YEAR:
        start = getStartOfYear(now);
        break;
      default:
        start = getStartOfMonth(now);
    }

    return {
      startTimestamp: Math.floor(start.getTime() / 1000),
      endTimestamp: Math.floor(now.getTime() / 1000),
    };
  }, [period]);

  // 무한 스크롤 쿼리
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['runningRecords', period, startTimestamp, endTimestamp],
    queryFn: ({ pageParam }) =>
      fetchRunningRecords({
        ...(pageParam !== undefined && { cursor: pageParam }),
        size: 20,
        startTimestamp,
        endTimestamp,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as number | undefined,
  });

  // 전체 기록 리스트
  const records = useMemo(() => {
    return data?.pages.flatMap((page) => page.contents) || [];
  }, [data]);

  // 로딩 상태
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
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
    return null; // EmptyState는 상위 컴포넌트에서 처리
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
              <ActivityIndicator size="small" color="#007AFF" />
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
