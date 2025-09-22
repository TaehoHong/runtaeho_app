import { baseApi } from './baseApi';

// TODO: Running 관련 models 마이그레이션 후 import 추가

/**
 * Running API endpoints
 * Swift Running 관련 서비스에서 마이그레이션 예정
 */
export const runningApi = baseApi.injectEndpoints({
  endpoints: () => ({
    // TODO: Swift Running 기능 마이그레이션 후 구현
  }),
});

// Export hooks will be added after migration