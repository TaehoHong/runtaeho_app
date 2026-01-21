/**
 * API Configuration
 */

// Environment-aware API configuration
// Android 에뮬레이터: `adb reverse tcp:8080 tcp:8080` 실행 필요
const getApiBaseUrl = (): string => {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    console.warn('⚠️ EXPO_PUBLIC_API_BASE_URL not set, using localhost');
    return 'http://localhost:8080/api/v1';
  }

  return baseUrl;
};

const isLoggingEnabled = (): boolean => {
  const enableLogging = process.env.EXPO_PUBLIC_ENABLE_LOGGING;
  return enableLogging === 'true' || __DEV__;
};

export const API_CONFIG = {
  // Base URL (from environment)
  BASE_URL: getApiBaseUrl(),

  // Environment
  ENV: process.env.EXPO_PUBLIC_ENV || 'local',

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
    ENABLED: isLoggingEnabled(),
    LOG_REQUEST: isLoggingEnabled(),
    LOG_RESPONSE: isLoggingEnabled(),
    LOG_ERROR: true, // Error는 항상 로깅
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
    ACCOUNTS: (userId: number) => `/users/accounts`,
    ACCOUNT_DISCONNECT: (accountId: number) => `/users/accounts/${accountId}`,
  },
  RUNNING: {
    BASE: '/running',
    START: '/running/start',
    END: (id: number) => `/running/${id}/end`,
    DETAIL: (id: number) => `/running/${id}`,
    SEARCH: '/running',
    ITEMS: (id: number) => `/running/${id}/items`,
  },
  AVATAR: {
    BASE: '/avatars',
    MAIN: '/avatars/main',
    UPDATE_EQUIPPED_ITEMS: (avatarId: number) => `/avatars/${avatarId}`,
    PURCHASE_AND_EQUIPE_ITEMS: (avatarId: number) => `/avatars/${avatarId}/items`,
  },
  ITEMS: {
    BASE: '/items'
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
    UPDATE_TO_MAIN: (id: number) => `/shoes/${id}/main`,
  },
  
  STATISTICS: {
    SUMMARY: '/running/statistics',
  },

  TERMS: {
    ALL: '/terms',
    PATCH_AGREEMENT: '/users/agreement',
  },

  LEAGUE: {
    CURRENT: '/league/current',
    PROFILE: '/league/profile',
    JOIN: '/league/join',
    RESULT: '/league/result',
    RESULT_CONFIRM: '/league/result/confirm',
  },

  LEAGUE_PARTICIPANT: {
    UPDATE_DISTANCE: (participantId: number) => `/league-participants/${participantId}/distance`,
  },
} as const;
