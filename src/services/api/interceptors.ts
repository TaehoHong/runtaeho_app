

import { AxiosError, type AxiosInstance } from 'axios';
import { API_CONFIG } from './config';

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
