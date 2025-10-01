import { createApi, fetchBaseQuery, FetchArgs } from '@reduxjs/toolkit/query/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootState } from '../index';

// 기본 fetchBaseQuery 설정
const baseFetchQuery = fetchBaseQuery({
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

// 로깅이 추가된 baseQuery
export const baseQuery: typeof baseFetchQuery = async (args, api, extraOptions) => {
  // URL 구성
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
  const url = typeof args === 'string' ? args : (args as FetchArgs).url;
  const method = typeof args === 'string' ? 'GET' : ((args as FetchArgs).method || 'GET');
  const body = typeof args === 'string' ? undefined : (args as FetchArgs).body;

  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  // 요청 로깅
  console.log('🚀 [REQUEST]', new Date().toISOString());
  console.log('   URL:', method, fullUrl);
  if (body) {
    console.log('   Body:', body);
  }

  const startTime = Date.now();

  // 실제 요청 실행
  const result = await baseFetchQuery(args, api, extraOptions);

  const duration = Date.now() - startTime;

  // 응답 로깅
  console.log('📥 [RESPONSE]', new Date().toISOString(), `(${duration}ms)`);
  console.log('   Status:', result.error ? (result.error as any).status : 200);
  if (result.data) {
    console.log('   Data:', result.data);
  }
  if (result.error) {
    console.log('   Error:', result.error);
  }

  return result;
};

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