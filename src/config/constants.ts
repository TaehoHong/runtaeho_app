/**
 * @deprecated 이 파일은 더 이상 사용되지 않습니다.
 * 새로운 상수들은 다음 파일들에서 import 해주세요:
 * - API 엔드포인트: ~/config/api-endpoints
 * - 앱 상수: ~/config/app-constants
 */

import Constants from 'expo-constants';

// 호환성을 위해 기존 export들을 유지
export const APP_CONFIG = {
  API_BASE_URL: Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:8080/api/v1',
  GOOGLE_CLIENT_ID: Constants.expoConfig?.extra?.googleClientId || '',

  // 개발/프로덕션 환경 구분
  IS_DEV: __DEV__,
  IS_PROD: !__DEV__,

  // 앱 정보
  APP_VERSION: Constants.expoConfig?.version || '1.0.0',
  BUNDLE_ID: Constants.expoConfig?.ios?.bundleIdentifier || 'com.hongtaeho.app',
} as const;

// 민감 정보는 별도 관리
export const SENSITIVE_CONFIG = {
  // 런타임에만 접근 가능한 민감 정보
  getGoogleApiKey: () => {
    // 실제로는 secure storage나 keychain에서 가져옴
    return process.env.GOOGLE_API_KEY || '';
  },

  getAppSecret: () => {
    return process.env.APP_SECRET || '';
  }
} as const;

// 새로운 상수들을 re-export (호환성 유지)
export {
  API_ENDPOINTS,
  AUTH_ENDPOINTS,
  USER_ENDPOINTS,
  RUNNING_ENDPOINTS,
  AVATAR_ENDPOINTS,
  POINT_ENDPOINTS,
  SHOE_ENDPOINTS,
  STATISTICS_ENDPOINTS,
} from './apiEndpoints';

export {
  ENVIRONMENT,
  APP_INFO,
  STORAGE_KEYS,
  RUNNING_CONSTANTS,
  UI_CONSTANTS,
  NETWORK_CONSTANTS,
  VALIDATION_CONSTANTS,
  DATE_CONSTANTS,
  OAUTH_PROVIDERS,
  PERMISSIONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from './appConstants';