import { useCallback } from 'react';
import {
  useGetRunningRecordsQuery,
  useLoadRunningRecordsQuery,
  useLazyLoadMoreRecordsQuery,
} from '../../../store/api/runningApi';
import { RunningRecord, formatRunningRecord } from '../models';

/**
 * 러닝 기록 조회 ViewModel
 * Swift RunningRecordService의 조회 관련 기능들을 React Hook으로 마이그레이션
 */
export const useRunningRecordViewModel = () => {
  /**
   * 페이지네이션 기반 러닝 기록 조회
   * Swift getRunningRecords 메서드 대응
   */
  const useRunningRecords = (params: {
    cursor?: number;
    size?: number;
    startDate?: Date;
    endDate?: Date;
  }) => {
    const {
      data,
      error,
      isLoading,
      isFetching,
      refetch,
    } = useGetRunningRecordsQuery(params);

    return {
      records: data?.content || [],
      cursor: data?.cursor,
      hasNext: data?.hasNext || false,
      error,
      isLoading,
      isFetching,
      refetch,
    };
  };

  /**
   * 기간별 전체 러닝 기록 로드
   * Swift loadRuningRecords 메서드 대응
   */
  const useLoadAllRecords = (params: { startDate: Date; endDate?: Date }) => {
    const {
      data: records,
      error,
      isLoading,
      isFetching,
      refetch,
    } = useLoadRunningRecordsQuery(params);

    return {
      records: records || [],
      error,
      isLoading,
      isFetching,
      refetch,
      formattedRecords: records?.map(record => ({
        ...record,
        formatted: formatRunningRecord(record),
      })) || [],
    };
  };

  /**
   * 무한 스크롤을 위한 더 많은 기록 로드
   * Swift loadMoreRecords 메서드 대응
   */
  const useLoadMoreRecords = () => {
    const [loadMore, { data, error, isLoading }] = useLazyLoadMoreRecordsQuery();

    const loadMoreRecords = useCallback((cursor?: number, size: number = 20) => {
      return loadMore({ cursor, size });
    }, [loadMore]);

    return {
      loadMoreRecords,
      moreRecords: data?.content || [],
      cursor: data?.cursor,
      hasNext: data?.hasNext || false,
      error,
      isLoading,
    };
  };

  /**
   * 러닝 기록 통계 계산
   */
  const calculateRecordStats = useCallback((records: RunningRecord[]) => {
    if (records.length === 0) {
      return {
        totalRuns: 0,
        totalDistance: 0,
        totalDuration: 0,
        totalCalories: 0,
        averageDistance: 0,
        averageDuration: 0,
        averagePace: 0,
        averageSpeed: 0,
      };
    }

    const totalDistance = records.reduce((sum, record) => sum + record.distance, 0);
    const totalDuration = records.reduce((sum, record) => sum + record.durationSec, 0);
    const totalCalories = records.reduce((sum, record) => sum + record.calorie, 0);

    const averageDistance = totalDistance / records.length;
    const averageDuration = totalDuration / records.length;

    // 평균 페이스 계산 (분/km)
    const averagePace = averageDistance > 0 ? (averageDuration / 60) / (averageDistance / 1000) : 0;

    // 평균 속도 계산 (km/h)
    const averageSpeed = averageDuration > 0 ? (averageDistance / 1000) / (averageDuration / 3600) : 0;

    return {
      totalRuns: records.length,
      totalDistance: Math.round(totalDistance),
      totalDuration: Math.round(totalDuration),
      totalCalories: Math.round(totalCalories),
      averageDistance: Math.round(averageDistance),
      averageDuration: Math.round(averageDuration),
      averagePace: Math.round(averagePace * 100) / 100,
      averageSpeed: Math.round(averageSpeed * 100) / 100,
    };
  }, []);

  /**
   * 월별 러닝 기록 그룹화
   */
  const groupRecordsByMonth = useCallback((records: RunningRecord[]) => {
    const grouped = records.reduce((acc, record) => {
      const date = new Date(record.startTimestamp * 1000);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(record);

      return acc;
    }, {} as Record<string, RunningRecord[]>);

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, monthRecords]) => ({
        month,
        records: monthRecords,
        stats: calculateRecordStats(monthRecords),
      }));
  }, [calculateRecordStats]);

  /**
   * 주별 러닝 기록 그룹화
   */
  const groupRecordsByWeek = useCallback((records: RunningRecord[]) => {
    const grouped = records.reduce((acc, record) => {
      const date = new Date(record.startTimestamp * 1000);
      const year = date.getFullYear();
      const weekNumber = getWeekNumber(date);
      const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;

      if (!acc[weekKey]) {
        acc[weekKey] = [];
      }
      acc[weekKey].push(record);

      return acc;
    }, {} as Record<string, RunningRecord[]>);

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([week, weekRecords]) => ({
        week,
        records: weekRecords,
        stats: calculateRecordStats(weekRecords),
      }));
  }, [calculateRecordStats]);

  return {
    // Hooks
    useRunningRecords,
    useLoadAllRecords,
    useLoadMoreRecords,

    // Utility functions
    calculateRecordStats,
    groupRecordsByMonth,
    groupRecordsByWeek,
  };
};

/**
 * 주차 번호 계산 헬퍼 함수
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}