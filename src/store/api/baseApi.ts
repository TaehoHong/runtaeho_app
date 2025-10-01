import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootState } from '../index';

// 기본 fetchBaseQuery 설정
export const baseQuery = fetchBaseQuery({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1',
  prepareHeaders: async (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.accessToken || await AsyncStorage.getItem('accessToken');

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// TokenRefreshInterceptor를 사용한 자동 토큰 갱신 baseQuery
// Spring AOP/Interceptor 패턴을 모방한 통합 관리
// 순환 참조 방지를 위해 lazy import 사용
let baseQueryWithReauthInstance: ReturnType<any> | null = null;

export const baseQueryWithReauth: typeof baseQuery = async (args, api, extraOptions) => {
  if (!baseQueryWithReauthInstance) {
    const { tokenRefreshInterceptor } = await import('../../shared/services/TokenRefreshInterceptor');
    baseQueryWithReauthInstance = tokenRefreshInterceptor.createBaseQueryWithAuth(baseQuery);
  }
  return baseQueryWithReauthInstance(args, api, extraOptions);
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'User', 'Running', 'Avatar', 'Point', 'Shoe', 'Statistic'],
  endpoints: () => ({}),
});

/**
 * 발전된 아키텍처 설명:
 *
 * 1. TokenRefreshInterceptor (주력 클래스)
 *    - 전역 토큰 갱신 로직 관리
 *    - Spring AOP/Interceptor 패턴 모방
 *    - 동시 요청 처리 (대기열 기능)
 *    - UserStateManager와 통합
 *
 * 2. UserStateManager (상태 관리)
 *    - refreshTokens(): 실제 토큰 갱신 API 호출
 *    - ensureValidTokens(): 사전 토큰 유효성 검사
 *    - 로컬 상태 및 AsyncStorage 관리
 *
 * 3. 모든 API 호출이 자동으로 토큰 갱신 적용
 *    - 개별 API에서 토큰 검증 로직 불필요
 *    - 401 에러 시 자동 갱신 후 재시도
 *    - 갱신 실패 시 자동 로그아웃
 */