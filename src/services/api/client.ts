import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from './config';

/**
 * Axios API Client
 * RTK Query의 baseApi를 대체
 *
 * Features:
 * - 자동 토큰 주입
 * - 요청/응답 로깅
 * - 에러 핸들링
 * - Token Refresh Interceptor (별도 파일에서 설정)
 */

/**
 * Axios 인스턴스 생성
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.DEFAULT_HEADERS,
});

/**
 * Request Interceptor
 * - Access Token 자동 주입
 * - 요청 로깅
 */
apiClient.interceptors.request.use(
  async (config) => {
    // Access Token 가져오기 (AsyncStorage에서)
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (error) {
      console.error('[API Client] Failed to get access token:', error);
    }

    // 요청 로깅 (개발 환경에서만)
    if (API_CONFIG.LOGGING.ENABLED && API_CONFIG.LOGGING.LOG_REQUEST) {
      const timestamp = new Date().toISOString();
      console.log(`🚀 [REQUEST] ${timestamp}`);
      console.log(`   ${config.method?.toUpperCase()} ${config.url}`);

      if (config.params && Object.keys(config.params).length > 0) {
        console.log('   Params:', config.params);
      }

      if (config.data) {
        console.log('   Body:', config.data);
      }
    }

    return config;
  },
  (error) => {
    console.error('[API Client] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * - 응답 로깅
 * - 에러 핸들링
 */
apiClient.interceptors.response.use(
  (response) => {
    // 응답 로깅 (개발 환경에서만)
    if (API_CONFIG.LOGGING.ENABLED && API_CONFIG.LOGGING.LOG_RESPONSE) {
      const timestamp = new Date().toISOString();
      const duration = response.config.metadata?.startTime
        ? Date.now() - response.config.metadata.startTime
        : 0;

      console.log(`📥 [RESPONSE] ${timestamp} (${duration}ms)`);
      console.log(`   ${response.config.method?.toUpperCase()} ${response.config.url}`);
      console.log(`   Status: ${response.status} ${response.statusText}`);

      if (response.data) {
        console.log('   Data:', response.data);
      }
    }

    return response;
  },
  (error: AxiosError) => {
    // 에러 로깅 (개발 환경에서만)
    if (API_CONFIG.LOGGING.ENABLED && API_CONFIG.LOGGING.LOG_ERROR) {
      const timestamp = new Date().toISOString();
      console.log(`❌ [ERROR] ${timestamp}`);
      console.log(`   ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
      console.log(`   Status: ${error.response?.status || 'Network Error'}`);

      if (error.response?.data) {
        console.log('   Error Data:', error.response.data);
      }

      if (error.message) {
        console.log('   Message:', error.message);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Request 시작 시간 기록을 위한 Interceptor
 */
apiClient.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() };
  return config;
});

/**
 * 타입 확장: Axios Config에 metadata 추가
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}

/**
 * API Client 유틸리티 함수
 */
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

export default apiClient;
