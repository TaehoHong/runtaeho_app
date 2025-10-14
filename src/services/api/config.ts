/**
 * API Configuration
 */

export const API_CONFIG = {
  // Base URL
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1',

  // Timeout 설정
  TIMEOUT: 30000, // 30초

  // Headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },

  // Token Refresh 설정
  TOKEN_REFRESH: {
    // Token 만료 임박 시간 (초) - 이 시간 남았을 때 갱신
    EXPIRING_SOON_THRESHOLD: 5 * 60, // 5분

    // 최대 재시도 횟수
    MAX_RETRY_COUNT: 3,

    // 재시도 대기 시간 (ms)
    RETRY_DELAY: 1000,
  },

  // Logging 설정
  LOGGING: {
    ENABLED: __DEV__, // 개발 환경에서만 활성화
    LOG_REQUEST: true,
    LOG_RESPONSE: true,
    LOG_ERROR: true,
  },
} as const;

/**
 * API Endpoints
 * 필요시 엔드포인트 경로를 여기에 정의
 */
export const API_ENDPOINTS = {
  AUTH: {
    OAUTH_GOOGLE: '/oauth/google',
    OAUTH_APPLE: '/oauth/apple',
    REFRESH: '/auth/refresh'
  },
  USER: {
    BASE: '/users',
    ME: '/users/me',
    ACCOUNT_CONNECT: (provider: string) => `/user/account/connect/${provider}`,
    ACCOUNT_DISCONNECT: (provider: string) => `/user/account/disconnect/${provider}`,
  },
  RUNNING: {
    BASE: '/running',
    START: '/running/start',
    END: (id: number) => `/running/${id}/end`,
    DETAIL: (id: number) => `/running/${id}`,
    SEARCH: '/running',
  },
  AVATAR: {
    BASE: '/avatars',
    MAIN: '/avatars/main',
    UPDATE_EQUIPPED_ITEMS: (avatarId: number) => `/avatars/${avatarId}`,
    DETAIL: (id: number) => `/avatars/${id}`,
    ITEMS: (avatarId: number) => `/avatars/${avatarId}/items`,
    REMOVE_ITEM: (avatarId: number, itemId: number) => `/avatars/${avatarId}/items/${itemId}`,
  },
  ITEMS: {
    BASE: '/items',
    TYPES: '/items/types',
    BY_TYPE: (typeId: number) => `/items/type/${typeId}`,
    DETAIL: (itemId: number) => `/items/${itemId}`,
    SEARCH: '/items/search',
    POPULAR: '/items/popular',
    NEW: '/items/new',
    RECOMMENDED: '/items/recommended',
  },
  USER_ITEMS: {
    BASE: '/user-items',
    PURCHASE_ITEMS : '/user-items'
  },
  POINT: {
    BASE: '/users/points',
    HISTORIES: '/users/points/histories',
  },
  SHOE: {
    BASE: '/shoes',
    ALL: '/shoes',
    PATCH: (id: number) => `/shoes/${id}`,
  },
  
  STATISTICS: {
    SUMMARY: '/running/statistics',
  },
} as const;
