

import { AxiosError, type AxiosInstance } from 'axios';
import { API_CONFIG } from './config';
import { reportError, addBreadcrumb } from '~/config/sentry';

/**
 * 추가 Response Interceptor (로깅 전용)
 */
export const httpResponseLogging = (client: AxiosInstance) => {
  client.interceptors.response.use(
    (response) => {
      // 응답 로깅 (개발 환경에서만)
      if (API_CONFIG.LOGGING.ENABLED && API_CONFIG.LOGGING.LOG_RESPONSE) {
        const timestamp = new Date().toISOString();
        const duration = response.config.metadata?.startTime
          ? Date.now() - response.config.metadata.startTime
          : 0;

        console.log(`📥 [RESPONSE] ${timestamp} (${duration}ms)`);
        console.log(`   ${response.config.method?.toUpperCase()} Status: ${response.status}`);
      }

      return response;
    },
    (error: AxiosError) => {
      // 에러 로깅 (개발 환경에서만)
      if (API_CONFIG.LOGGING.ENABLED && API_CONFIG.LOGGING.LOG_ERROR) {
        const timestamp = new Date().toISOString();
        console.log(`❌ [ERROR] ${timestamp}`);
        console.log(`   ${error.config?.method?.toUpperCase()}`);
        console.log(`   Status: ${error.response?.status || 'Network Error'}`);
      }

      // Sentry에 API 에러 리포팅 (특정 에러는 제외)
      const shouldReportToSentry = true;
        // error.response?.status !== 401 && // 인증 에러 제외 (토큰 갱신 중)
        // error.response?.status !== 403 && // 권한 에러 제외
        // error.message !== 'Network Error' && // 네트워크 에러 제외
        // !error.message?.includes('timeout'); // 타임아웃 제외

      if (shouldReportToSentry) {
        // AxiosError에는 요청 헤더/본문이 포함된다. 원본은 호출자에게만 전달한다.
        reportError(new Error('API request failed'), {
          type: 'api-error',
          method: error.config?.method,
          status: error.response?.status,
        });
      }

      return Promise.reject(error);
    }
  );
};

/**
 * Request 시작 시간 기록을 위한 Interceptor
 */
export const httpRequestLogging = (client: AxiosInstance) => {
  client.interceptors.request.use((config) => {
    config.metadata = { startTime: Date.now() };

    // 요청 로깅 (개발 환경에서만)
    if (API_CONFIG.LOGGING.ENABLED && API_CONFIG.LOGGING.LOG_REQUEST) {
      const timestamp = new Date().toISOString();
      console.log(`   ${config.method?.toUpperCase()}`);
      console.log(`🚀 [REQUEST] ${timestamp}`);
    }

    // Sentry Breadcrumb 추가
    addBreadcrumb(
      `API Request: ${config.method?.toUpperCase()}`,
      'http',
      {
        method: config.method,
      }
    );

    return config;
  });
};

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
