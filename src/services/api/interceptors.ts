

import { AxiosError, isCancel, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { API_CONFIG } from './config';
import { reportError, addBreadcrumb } from '~/config/sentry';

const getApiOperation = (config?: AxiosRequestConfig) => {
  // Only known resource names are diagnostic labels; identifiers and query values never are.
  const resource = config?.url?.match(/^\/(?:api\/v1\/)?(running|users|avatars|items|user-items|shoes|league|leagues|garmin|notifications|inquiries|auth|oauth|app)(?:\/|\?|$)/)?.[1] ?? 'api';
  return `${config?.method?.toUpperCase() ?? 'REQUEST'} ${resource}`;
};

/**
 * 추가 Response Interceptor (로깅 전용)
 */
export const httpResponseLogging = (client: AxiosInstance) => {
  const reported = new WeakSet<Error>();
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

      const status = error.response?.status;
      const expected = isCancel(error) ||
        ['SessionSupersededError', 'RefreshTokenExpiredError'].includes(error.name) ||
        error.code === 'ERR_NETWORK' || error.message === 'Network Error' ||
        status === 400 || status === 422;

      if (!expected && !reported.has(error)) {
        // Nested auth retries can reject through this interceptor twice.
        reported.add(error);
        // AxiosError에는 요청 헤더/본문이 포함된다. 원본은 호출자에게만 전달한다.
        const operation = getApiOperation(error.config);
        reportError(new Error(`API ${operation} failed (${status ?? 'transport'})`), {
          type: 'api-error',
          operation,
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
      `API Request: ${getApiOperation(config)}`,
      'http',
      {
        method: config.method,
        operation: getApiOperation(config),
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
