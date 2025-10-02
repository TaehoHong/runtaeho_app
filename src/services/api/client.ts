import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { tokenStorage } from '../../utils/storage';
import { useAuthStore } from '~/stores';
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

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if(__DEV__) console.debug('[API_CLIENT] add Token to Headers token: ', token)
  const needsAuth = config.headers?.['x-requires-auth'] !== 'false'; // 기본: 필요, 옵션으로 끔
  if (needsAuth && token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response는 FIFO이므로, "마지막에 실행"되게 하려면 가장 나중에 등록합니다.
httpResponseLogging(apiClient);

export default apiClient;
