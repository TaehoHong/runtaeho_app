import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseApi';
import {
  PointHistory,
  PointHistoryRequest,
  CursorResult,
} from '../../features/point/models';

/**
 * Point API
 * Swift PointApiService를 RTK Query로 마이그레이션
 */
export const pointApi = createApi({
  reducerPath: 'pointApi',
  baseQuery,
  tagTypes: ['PointHistory', 'UserPoint'],
  endpoints: (builder) => ({
    /**
     * 포인트 히스토리 조회
     * Swift PointApiService.getPointHistories 메서드 대응
     */
    getPointHistories: builder.query<CursorResult<PointHistory>, PointHistoryRequest>({
      query: (params) => ({
        url: '/point/histories',
        params: {
          cursor: params.cursor,
          isEarned: params.isEarned,
          startCreatedTimestamp: params.startCreatedTimestamp,
          size: params.size || 30,
        },
      }),
      providesTags: ['PointHistory'],
      serializeQueryArgs: ({ queryArgs }) => {
        // cursor를 제외한 나머지 파라미터로 캐시 키 생성
        const { cursor, ...rest } = queryArgs;
        return rest;
      },
      merge: (currentCache, newItems, { arg }) => {
        // cursor가 있으면 기존 데이터에 추가, 없으면 새로운 데이터로 교체
        if (arg.cursor) {
          return {
            ...newItems,
            content: [...currentCache.content, ...newItems.content],
          };
        }
        return newItems;
      },
      forceRefetch({ currentArg, previousArg }) {
        // cursor가 변경되거나 다른 필터 조건이 변경되면 refetch
        return currentArg !== previousArg;
      },
    }),

    /**
     * 사용자 포인트 잔액 조회
     * Swift getUserPoint 메서드 대응
     */
    getUserPoint: builder.query<{ userId: number; point: number }, void>({
      query: () => '/point',
      providesTags: ['UserPoint'],
    }),

    /**
     * 포인트 적립/차감
     * Swift updateUserPoint 메서드 대응
     */
    updateUserPoint: builder.mutation<
      { userId: number; point: number },
      { pointTypeId: number; point: number; runningRecordId?: number; itemId?: number }
    >({
      query: (body) => ({
        url: '/point',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserPoint', 'PointHistory'],
    }),

    /**
     * 러닝 완료 시 포인트 적립
     * Swift earnRunningPoints 메서드 대응
     */
    earnRunningPoints: builder.mutation<
      { userId: number; point: number },
      { runningRecordId: number; distance: number; duration: number }
    >({
      query: (body) => ({
        url: '/point/running',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserPoint', 'PointHistory'],
    }),

    /**
     * 아이템 구매 시 포인트 차감
     * Swift spendPointsForItem 메서드 대응
     */
    spendPointsForItem: builder.mutation<
      { userId: number; point: number },
      { itemId: number; itemPrice: number }
    >({
      query: (body) => ({
        url: '/point/spend',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserPoint', 'PointHistory'],
    }),

    /**
     * 일일 보너스 포인트 적립
     * Swift earnDailyBonus 메서드 대응
     */
    earnDailyBonus: builder.mutation<
      { userId: number; point: number },
      { consecutiveDays: number }
    >({
      query: (body) => ({
        url: '/point/daily-bonus',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserPoint', 'PointHistory'],
    }),

    /**
     * 포인트 히스토리 무한 스크롤 로드
     * Swift PointViewModel.loadOlderHistories 메서드 대응
     */
    loadMorePointHistories: builder.query<CursorResult<PointHistory>, PointHistoryRequest>({
      query: (params) => ({
        url: '/point/histories',
        params: {
          cursor: params.cursor,
          isEarned: params.isEarned,
          startCreatedTimestamp: params.startCreatedTimestamp,
          size: params.size || 30,
        },
      }),
      providesTags: ['PointHistory'],
    }),

    /**
     * 최근 3개월 포인트 히스토리 조회
     * Swift PointViewModel.loadInitialData 메서드 대응
     */
    getRecentPointHistories: builder.query<CursorResult<PointHistory>, { startDate: Date }>({
      query: ({ startDate }) => ({
        url: '/point/histories',
        params: {
          startCreatedTimestamp: Math.floor(startDate.getTime() / 1000),
          size: 100, // 최근 3개월 데이터 충분히 로드
        },
      }),
      providesTags: ['PointHistory'],
    }),

    /**
     * 포인트 통계 조회
     * Swift calculatePointStatistics 관련 기능
     */
    getPointStatistics: builder.query<{
      totalEarned: number;
      totalSpent: number;
      currentBalance: number;
      todayEarned: number;
      weeklyEarned: number;
      monthlyEarned: number;
    }, void>({
      query: () => '/point/statistics',
      providesTags: ['UserPoint', 'PointHistory'],
    }),
  }),
});

export const {
  useGetPointHistoriesQuery,
  useGetUserPointQuery,
  useUpdateUserPointMutation,
  useEarnRunningPointsMutation,
  useSpendPointsForItemMutation,
  useEarnDailyBonusMutation,
  useLoadMorePointHistoriesQuery,
  useGetRecentPointHistoriesQuery,
  useGetPointStatisticsQuery,
} = pointApi;