/**
 * 앱 전체에서 사용하는 상수들을 중앙 관리
 */

/**
 * 환경 설정
 */
export const ENVIRONMENT = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080',
  WEB_BASE_URL: process.env.EXPO_PUBLIC_WEB_BASE_URL || 'http://localhost:3000',
  ENABLE_DEBUG: __DEV__,
  ENABLE_LOGGING: __DEV__,
} as const;

/**
 * 앱 메타 정보
 */
export const APP_INFO = {
  NAME: 'RunTaeho',
  VERSION: '1.0.0',
  BUILD_NUMBER: 1,
  PACKAGE_NAME: 'com.hongtaeho.app',
} as const;

/**
 * 스토리지 키
 */
export const STORAGE_KEYS = {
  // 인증 관련
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  IS_LOGGED_IN: 'isLoggedIn',

  // 사용자 정보
  CURRENT_USER: 'currentUser',
  USER_SETTINGS: 'userSettings',
  USER_PREFERENCES: 'userPreferences',

  // 러닝 관련
  LAST_RUNNING_RECORD: 'lastRunningRecord',
  RUNNING_SETTINGS: 'runningSettings',
  GPS_PERMISSIONS: 'gpsPermissions',

  // 앱 상태
  FIRST_LAUNCH: 'firstLaunch',
  ONBOARDING_COMPLETED: 'onboardingCompleted',
  THEME_MODE: 'themeMode',
  LANGUAGE: 'language',

  // 캐시
  CACHE_USER_DATA: 'cache_userData',
  CACHE_RUNNING_STATS: 'cache_runningStats',
  CACHE_AVATAR_DATA: 'cache_avatarData',
} as const;

/**
 * 러닝 관련 상수
 */
export const RUNNING_CONSTANTS = {
  // 시간 단위 (초)
  MIN_RUNNING_DURATION: 60, // 최소 1분
  MAX_RUNNING_DURATION: 28800, // 최대 8시간

  // 거리 단위 (미터)
  MIN_RUNNING_DISTANCE: 100, // 최소 100m
  MAX_RUNNING_DISTANCE: 100000, // 최대 100km

  // GPS 정확도
  GPS_ACCURACY_THRESHOLD: 10, // 10미터 이내
  GPS_UPDATE_INTERVAL: 1000, // 1초마다

  // 페이스 계산
  DEFAULT_PACE_MINUTES: 6, // 기본 페이스 6분/km
  MIN_PACE_MINUTES: 3, // 최소 페이스 3분/km
  MAX_PACE_MINUTES: 15, // 최대 페이스 15분/km

  // 칼로리 계산
  DEFAULT_WEIGHT_KG: 70, // 기본 체중 70kg
  RUNNING_MET: 9.8, // 러닝 MET 값
  WALKING_MET: 3.8, // 걷기 MET 값

  // 하트레이트
  DEFAULT_BPM_RANGE: [120, 150] as const,
  REST_BPM_RANGE: [60, 100] as const,
  MAX_BPM_RANGE: [180, 220] as const,
} as const;

/**
 * UI 관련 상수
 */
export const UI_CONSTANTS = {
  // 타이밍
  ANIMATION_DURATION: 250,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  LOADING_TIMEOUT: 30000, // 30초

  // 크기
  SCREEN_PADDING: 16,
  CARD_BORDER_RADIUS: 12,
  BUTTON_HEIGHT: 48,
  INPUT_HEIGHT: 44,

  // 색상 (기본값, 테마에서 오버라이드 가능)
  COLORS: {
    PRIMARY: '#007AFF',
    SECONDARY: '#5856D6',
    SUCCESS: '#34C759',
    WARNING: '#FF9500',
    ERROR: '#FF3B30',
    INFO: '#5AC8FA',

    // 그레이스케일
    BLACK: '#000000',
    WHITE: '#FFFFFF',
    GRAY_50: '#F9FAFB',
    GRAY_100: '#F3F4F6',
    GRAY_200: '#E5E7EB',
    GRAY_300: '#D1D5DB',
    GRAY_400: '#9CA3AF',
    GRAY_500: '#6B7280',
    GRAY_600: '#4B5563',
    GRAY_700: '#374151',
    GRAY_800: '#1F2937',
    GRAY_900: '#111827',
  },

  // 폰트 크기
  FONT_SIZES: {
    XS: 12,
    SM: 14,
    BASE: 16,
    LG: 18,
    XL: 20,
    '2XL': 24,
    '3XL': 30,
    '4XL': 36,
  },

  // Z-인덱스
  Z_INDEX: {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
    TOAST: 1080,
  },
} as const;

/**
 * 네트워크 관련 상수
 */
export const NETWORK_CONSTANTS = {
  // 타임아웃 (밀리초)
  REQUEST_TIMEOUT: 30000, // 30초
  UPLOAD_TIMEOUT: 60000, // 60초
  DOWNLOAD_TIMEOUT: 120000, // 2분

  // 재시도
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1초

  // 캐시
  CACHE_DURATION: 300000, // 5분
  MAX_CACHE_SIZE: 50, // 최대 50개 항목

  // HTTP 상태 코드
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },
} as const;

/**
 * 유효성 검사 상수
 */
export const VALIDATION_CONSTANTS = {
  // 이메일
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  EMAIL_MAX_LENGTH: 254,

  // 패스워드
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]/,

  // 이름
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  NAME_REGEX: /^[가-힣a-zA-Z\s]+$/,

  // 숫자
  WEIGHT_MIN: 30,
  WEIGHT_MAX: 200,
  HEIGHT_MIN: 100,
  HEIGHT_MAX: 250,
  AGE_MIN: 13,
  AGE_MAX: 120,
} as const;

/**
 * 날짜/시간 관련 상수
 */
export const DATE_CONSTANTS = {
  // 포맷
  DATE_FORMAT: 'YYYY-MM-DD',
  TIME_FORMAT: 'HH:mm:ss',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  DISPLAY_DATE_FORMAT: 'YYYY년 MM월 DD일',
  DISPLAY_TIME_FORMAT: 'HH:mm',

  // 기간
  ONE_SECOND: 1000,
  ONE_MINUTE: 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
  ONE_YEAR: 365 * 24 * 60 * 60 * 1000,

  // 요일
  WEEKDAYS: ['일', '월', '화', '수', '목', '금', '토'] as const,
  WEEKDAYS_EN: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const,

  // 월
  MONTHS: [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ] as const,
  MONTHS_EN: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ] as const,
} as const;

/**
 * OAuth 제공자 상수
 */
export const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  APPLE: 'apple',
} as const;

/**
 * 퍼미션 관련 상수
 */
export const PERMISSIONS = {
  LOCATION: 'location',
  LOCATION_WHEN_IN_USE: 'location_when_in_use',
  LOCATION_ALWAYS: 'location_always',
  CAMERA: 'camera',
  PHOTO_LIBRARY: 'photo_library',
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * 에러 메시지
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
  AUTH_REQUIRED: '로그인이 필요합니다.',
  PERMISSION_DENIED: '권한이 거부되었습니다.',
  INVALID_INPUT: '입력 정보를 확인해주세요.',
  SERVER_ERROR: '서버 오류가 발생했습니다.',
  TIMEOUT_ERROR: '요청 시간이 초과되었습니다.',
} as const;

/**
 * 성공 메시지
 */
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: '로그인되었습니다.',
  LOGOUT_SUCCESS: '로그아웃되었습니다.',
  SAVE_SUCCESS: '저장되었습니다.',
  DELETE_SUCCESS: '삭제되었습니다.',
  UPDATE_SUCCESS: '업데이트되었습니다.',
} as const;