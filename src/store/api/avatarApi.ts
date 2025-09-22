import { baseApi } from './baseApi';

/**
 * Avatar API endpoints
 * Swift Avatar 관련 서비스에서 마이그레이션 예정
 */
export const avatarApi = baseApi.injectEndpoints({
  endpoints: () => ({
    // TODO: Swift Avatar 기능 마이그레이션 후 구현
  }),
});

// Export hooks will be added after migration