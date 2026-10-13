import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { getSessionSnapshot, isSessionCurrent, useAuthStore, type SessionSnapshot } from '~/features/auth/stores/authStore';
import { SessionSupersededError } from '~/utils/storage/errors';
import { API_CONFIG } from './config';
import { httpRequestLogging, httpResponseLogging } from './interceptors';

/**
 * Axios API Client
 */

/**
 * Axios 인스턴스 생성
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.DEFAULT_HEADERS,
});

export const apiUtils = {
  /**
   * GET 요청
   */
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config),

  /**
   * POST 요청
   */
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config),

  /**
   * PUT 요청
   */
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config),

  /**
   * PATCH 요청
   */
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config),

  /**
   * DELETE 요청
   */
  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config),

  /**
   * Base URL 가져오기
   */
  getBaseURL: () => apiClient.defaults.baseURL,

  /**
   * Timeout 설정
   */
  setTimeout: (timeout: number) => {
    apiClient.defaults.timeout = timeout;
  },

  /**
   * 기본 헤더 설정
   */
  setDefaultHeader: (key: string, value: string) => {
    apiClient.defaults.headers.common[key] = value;
  },

  /**
   * 기본 헤더 제거
   */
  removeDefaultHeader: (key: string) => {
    delete apiClient.defaults.headers.common[key];
  },
};

// ---- Interceptor Registration Order ----
httpRequestLogging(apiClient);

// 토큰 자동 추가 및 사전 갱신 인터셉터
apiClient.interceptors.request.use(async (config) => {
  if (config.sessionSnapshot && !isSessionCurrent(config.sessionSnapshot)) throw new SessionSupersededError();
  const needsAuth = config.headers?.['x-requires-auth'] !== 'false'; // 기본: 필요, 옵션으로 끔

  if (needsAuth) {
    const snapshot = config.sessionSnapshot ?? getSessionSnapshot();
    config.sessionSnapshot = snapshot;
    if (!isSessionCurrent(snapshot)) throw new SessionSupersededError();
    // 사전 토큰 검증 및 갱신 (TokenRefreshInterceptor)
    // Lazy loading avoids the apiClient / refresh coordinator initialization cycle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { tokenRefreshInterceptor } = require('~/shared/services/TokenRefreshInterceptor') as typeof import('~/shared/services/TokenRefreshInterceptor');
    await tokenRefreshInterceptor.validateAndRefreshIfNeeded();

    if (!isSessionCurrent(snapshot)) throw new SessionSupersededError();

    // 최신 토큰 가져오기
    const token = useAuthStore.getState().accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

// Response는 FIFO이므로, "마지막에 실행"되게 하려면 가장 나중에 등록합니다.
httpResponseLogging(apiClient);

// Register before the first request: Axios snapshots this chain before running
// async request interceptors, so registering during token lookup misses its 401.
apiClient.interceptors.response.use(response => response, error => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { tokenRefreshInterceptor } = require('~/shared/services/TokenRefreshInterceptor') as typeof import('~/shared/services/TokenRefreshInterceptor');
  return tokenRefreshInterceptor.handleResponseError(error);
});

export default apiClient;

declare module 'axios' {
  export interface AxiosRequestConfig {
    sessionSnapshot?: SessionSnapshot;
    authRetried?: boolean;
  }
}
