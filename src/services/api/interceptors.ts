

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

      // Sentry에 API 에러 리포팅 (특정 에러는 제외)
      const shouldReportToSentry = true;
        // error.response?.status !== 401 && // 인증 에러 제외 (토큰 갱신 중)
        // error.response?.status !== 403 && // 권한 에러 제외
        // error.message !== 'Network Error' && // 네트워크 에러 제외
        // !error.message?.includes('timeout'); // 타임아웃 제외

      if (shouldReportToSentry) {
        reportError(error, {
          type: 'api-error',
          method: error.config?.method,
          url: error.config?.url,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
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
      console.log(`   ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`🚀 [REQUEST] ${timestamp}`);
      if (config.headers && Object.keys(config.headers).length > 0) {
        console.log('   Headers:', config.headers);
      }
      if (config.params && Object.keys(config.params).length > 0) {
        console.log('   Params:', config.params);
      }
      if (config.data) {
        console.log('   Body:', config.data);
      }
    }

    // Sentry Breadcrumb 추가
    addBreadcrumb(
      `API Request: ${config.method?.toUpperCase()} ${config.url}`,
      'http',
      {
        method: config.method,
        url: config.url,
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
