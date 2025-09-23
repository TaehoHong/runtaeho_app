import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseApi';
import {
  Shoe,
  AddShoeDto,
  PatchShoeDto,
  ShoeListRequest,
  CursorResult,
} from '../../features/shoes/models';

/**
 * Shoe API
 * Swift ShoeApiService를 RTK Query로 마이그레이션
 */
export const shoeApi = createApi({
  reducerPath: 'shoeApi',
  baseQuery,
  tagTypes: ['Shoe'],
  endpoints: (builder) => ({
    /**
     * 신발 목록 조회 (커서 기반)
     * Swift ShoeApiService.fetchShoesCursor 메서드 대응
     */
    getShoesCursor: builder.query<CursorResult<Shoe>, ShoeListRequest>({
      query: (params) => ({
        url: '/shoes',
        params: {
          cursor: params.cursor,
          isEnabled: params.isEnabled,
          size: params.size || 10,
        },
      }),
      providesTags: ['Shoe'],
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
     * 모든 신발 목록 조회
     * Swift getAllShoes 메서드 대응
     */
    getAllShoes: builder.query<Shoe[], { isEnabled?: boolean }>({
      query: (params) => ({
        url: '/shoes/all',
        params,
      }),
      providesTags: ['Shoe'],
    }),

    /**
     * 신발 상세 조회
     * Swift getShoeDetail 메서드 대응
     */
    getShoeDetail: builder.query<Shoe, number>({
      query: (shoeId) => `/shoes/${shoeId}`,
      providesTags: ['Shoe'],
    }),

    /**
     * 메인 신발 조회
     * Swift getMainShoe 메서드 대응
     */
    getMainShoe: builder.query<Shoe | null, void>({
      query: () => '/shoes/main',
      providesTags: ['Shoe'],
    }),

    /**
     * 신발 추가
     * Swift ShoeApiService.addShoe 메서드 대응
     */
    addShoe: builder.mutation<Shoe, AddShoeDto>({
      query: (addShoeDto) => ({
        url: '/shoes',
        method: 'POST',
        body: addShoeDto,
      }),
      invalidatesTags: ['Shoe'],
    }),

    /**
     * 신발 수정
     * Swift ShoeApiService.patchShoe 메서드 대응
     */
    patchShoe: builder.mutation<Shoe, PatchShoeDto>({
      query: (patchShoeDto) => ({
        url: `/shoes/${patchShoeDto.id}`,
        method: 'PATCH',
        body: patchShoeDto,
      }),
      invalidatesTags: ['Shoe'],
    }),

    /**
     * 신발 삭제
     * Swift deleteShoe 메서드 대응
     */
    deleteShoe: builder.mutation<void, number>({
      query: (shoeId) => ({
        url: `/shoes/${shoeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Shoe'],
    }),

    /**
     * 메인 신발 설정
     * Swift setMainShoe 메서드 대응
     */
    setMainShoe: builder.mutation<Shoe, number>({
      query: (shoeId) => ({
        url: `/shoes/${shoeId}/main`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Shoe'],
    }),

    /**
     * 신발 활성화/비활성화
     * Swift toggleShoeEnabled 메서드 대응
     */
    toggleShoeEnabled: builder.mutation<Shoe, { shoeId: number; isEnabled: boolean }>({
      query: ({ shoeId, isEnabled }) => ({
        url: `/shoes/${shoeId}`,
        method: 'PATCH',
        body: { isEnabled },
      }),
      invalidatesTags: ['Shoe'],
    }),

    /**
     * 신발 거리 업데이트
     * Swift updateShoeDistance 메서드 대응
     */
    updateShoeDistance: builder.mutation<Shoe, { shoeId: number; distance: number }>({
      query: ({ shoeId, distance }) => ({
        url: `/shoes/${shoeId}/distance`,
        method: 'PATCH',
        body: { distance },
      }),
      invalidatesTags: ['Shoe'],
    }),

    /**
     * 신발 목표 거리 설정
     * Swift setShoeTarget 메서드 대응
     */
    setShoeTarget: builder.mutation<Shoe, { shoeId: number; targetDistance: number }>({
      query: ({ shoeId, targetDistance }) => ({
        url: `/shoes/${shoeId}/target`,
        method: 'PATCH',
        body: { targetDistance },
      }),
      invalidatesTags: ['Shoe'],
    }),

    /**
     * 신발 은퇴 처리
     * Swift retireShoe 메서드 대응
     */
    retireShoe: builder.mutation<Shoe, number>({
      query: (shoeId) => ({
        url: `/shoes/${shoeId}/retire`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Shoe'],
    }),

    /**
     * 신발 통계 조회
     * Swift getShoeStatistics 메서드 대응
     */
    getShoeStatistics: builder.query<{
      totalShoes: number;
      activeShoes: number;
      retiredShoes: number;
      totalDistance: number;
      averageDistance: number;
      achievedGoals: number;
      shoesWithGoals: number;
      achievementRate: number;
    }, void>({
      query: () => '/shoes/statistics',
      providesTags: ['Shoe'],
    }),
  }),
});

export const {
  useGetShoesCursorQuery,
  useGetAllShoesQuery,
  useGetShoeDetailQuery,
  useGetMainShoeQuery,
  useAddShoeMutation,
  usePatchShoeMutation,
  useDeleteShoeMutation,
  useSetMainShoeMutation,
  useToggleShoeEnabledMutation,
  useUpdateShoeDistanceMutation,
  useSetShoeTargetMutation,
  useRetireShoeMutation,
  useGetShoeStatisticsQuery,
} = shoeApi;