import Constants from 'expo-constants';

// 앱 설정 상수
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