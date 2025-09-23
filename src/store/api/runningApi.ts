import { baseApi } from './baseApi';
import {
  RunningRecord,
  RunningRecordItem,
  EndRunningRecord,
  createRunningRecord,
} from '../../features/running/models';

/**
 * 페이지네이션 결과 인터페이스
 */
interface CursorResult<T> {
  content: T[];
  cursor?: number;
  hasNext: boolean;
}

/**
 * Running API endpoints
 * Swift RunningRecordService.swift, RunningRecordAPIService.swift에서 마이그레이션
 */
export const runningApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * 러닝 시작
     * Swift: startRunning() 메서드
     */
    startRunning: builder.mutation<RunningRecord, void>({
      query: () => ({
        url: '/running/start',
        method: 'POST',
        body: {
          startTimestamp: Math.floor(Date.now() / 1000).toString(),
        },
      }),
      transformResponse: (response: { id: number }) => createRunningRecord(response.id),
      invalidatesTags: ['Running'],
    }),

    /**
     * 러닝 종료
     * Swift: end(runningRecord:) 메서드
     */
    endRunning: builder.mutation<EndRunningRecord, RunningRecord>({
      query: (runningRecord) => ({
        url: `/running/${runningRecord.id}/end`,
        method: 'POST',
        body: runningRecord,
      }),
      invalidatesTags: ['Running'],
    }),

    /**
     * 러닝 기록 업데이트
     * Swift: update(runningRecord:) 메서드
     */
    updateRunningRecord: builder.mutation<void, RunningRecord>({
      query: (runningRecord) => ({
        url: `/running/${runningRecord.id}`,
        method: 'PUT',
        body: runningRecord,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Running', id }],
    }),

    /**
     * 러닝 기록 조회 (페이지네이션)
     * Swift: getRunningRecords() 메서드
     */
    getRunningRecords: builder.query<
      CursorResult<RunningRecord>,
      {
        cursor?: number;
        size?: number;
        startDate?: Date;
        endDate?: Date;
      }
    >({
      query: ({ cursor, size, startDate, endDate }) => {
        const params: Record<string, any> = {};

        if (cursor !== undefined) params.cursor = cursor;
        if (size !== undefined) params.size = size;
        if (startDate) params.startTimestamp = Math.floor(startDate.getTime() / 1000);
        if (endDate) params.endTimestamp = Math.floor(endDate.getTime() / 1000);

        return {
          url: '/running/search',
          params,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.content.map(({ id }) => ({ type: 'Running' as const, id })),
              { type: 'Running', id: 'LIST' },
            ]
          : [{ type: 'Running', id: 'LIST' }],
    }),

    /**
     * 기간별 러닝 기록 전체 로드
     * Swift: loadRuningRecords(startDate:endDate:) 메서드
     */
    loadRunningRecords: builder.query<
      RunningRecord[],
      { startDate: Date; endDate?: Date }
    >({
      queryFn: async ({ startDate, endDate }, api, extraOptions, baseQuery) => {
        try {
          const records: RunningRecord[] = [];
          let hasNext = true;
          let cursor: number | undefined = undefined;

          // 모든 페이지를 순차적으로 로드
          while (hasNext) {
            const result = await baseQuery({
              url: '/running/search',
              params: {
                cursor,
                startTimestamp: Math.floor(startDate.getTime() / 1000),
                endTimestamp: Math.floor((endDate || new Date()).getTime() / 1000),
              },
            });

            if (result.error) {
              return { error: result.error };
            }

            const page = result.data as CursorResult<RunningRecord>;
            records.push(...page.content);
            cursor = page.cursor;
            hasNext = page.hasNext;
          }

          // 시작 시간 기준 내림차순 정렬 (Swift와 동일)
          records.sort((a, b) => b.startTimestamp - a.startTimestamp);

          return { data: records };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      providesTags: [{ type: 'Running', id: 'FULL_LIST' }],
    }),

    /**
     * 더 많은 기록 로드 (무한 스크롤)
     * Swift: loadMoreRecords(cursor:size:) 메서드
     */
    loadMoreRecords: builder.query<
      CursorResult<RunningRecord>,
      { cursor?: number; size: number }
    >({
      query: ({ cursor, size }) => ({
        url: '/running/search',
        params: { cursor, size },
      }),
      providesTags: [{ type: 'Running', id: 'MORE' }],
    }),

    /**
     * 특정 러닝 기록 조회
     */
    getRunningRecord: builder.query<RunningRecord, number>({
      query: (id) => `/running/${id}`,
      providesTags: (result, error, id) => [{ type: 'Running', id }],
    }),

    /**
     * 러닝 기록 삭제
     */
    deleteRunningRecord: builder.mutation<void, number>({
      query: (id) => ({
        url: `/running/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Running', id },
        { type: 'Running', id: 'LIST' },
        { type: 'Running', id: 'FULL_LIST' },
      ],
    }),
  }),
});

// Export hooks
export const {
  useStartRunningMutation,
  useEndRunningMutation,
  useUpdateRunningRecordMutation,
  useGetRunningRecordsQuery,
  useLazyGetRunningRecordsQuery,
  useLoadRunningRecordsQuery,
  useLazyLoadRunningRecordsQuery,
  useLoadMoreRecordsQuery,
  useLazyLoadMoreRecordsQuery,
  useGetRunningRecordQuery,
  useLazyGetRunningRecordQuery,
  useDeleteRunningRecordMutation,
} = runningApi;