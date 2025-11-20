import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/**
 * Sentry 초기화 설정
 */
export const initializeSentry = () => {
  const environment = process.env.EXPO_PUBLIC_ENV || 'production';

  // local 환경에서는 Sentry 비활성화
  if (environment === 'local') {
    console.log('Sentry가 비활성화되었습니다. (EXPO_PUBLIC_ENV=local)');
    return;
  }

  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const releaseVersion = Constants.expoConfig?.version ?? '0.0.0';
  const distValue =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    null;

  if (!sentryDsn) {
    console.warn('Sentry DSN이 설정되지 않았습니다. 에러 리포팅이 비활성화됩니다.');
    return;
  }

  const options: Sentry.ReactNativeOptions = {
    dsn: sentryDsn,

    // 환경 설정 (EXPO_PUBLIC_ENV 기반)
    environment: environment,

    // 디버그 모드 (개발 환경에서만 활성화)
    debug: __DEV__,

    // 앱 버전 정보
    release: releaseVersion,

    // 성능 모니터링 (프로덕션에서만 활성화)
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000, // 30초

    // 트레이싱 샘플링 (프로덕션에서는 낮은 비율 사용)
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // 네이티브 크래시 리포팅
    enableNative: true,
    enableNativeCrashHandling: true,

    // 개발 환경에서도 Sentry로 전송
    enabled: true,

    // 사용자 정보 자동 수집 비활성화 (개인정보 보호)
    sendDefaultPii: true,

    // 에러 필터링
    beforeSend(event, hint) {
      // 개발 환경에서도 콘솔에 출력
      if (__DEV__) {
        console.error('Sentry Event (sending to Sentry):', event);
        console.error('Original Error:', hint.originalException);
      }

      // 특정 에러 무시 (예: 네트워크 타임아웃)
      const error = hint.originalException as Error;
      if (error?.message?.includes('Network request failed')) {
        return null;
      }

      return event;
    },

    // Breadcrumb 필터링
    beforeBreadcrumb(breadcrumb) {
      // 민감한 정보가 포함된 breadcrumb 제외
      if (breadcrumb.category === 'console' && breadcrumb.data?.arguments) {
        const args = breadcrumb.data.arguments;
        if (args.some((arg: string) => arg?.includes('token') || arg?.includes('password'))) {
          return null;
        }
      }
      return breadcrumb;
    },

    // 통합 설정
    integrations: [
      // React Navigation 통합 (라우트 추적)
      Sentry.reactNavigationIntegration(),
    ],
  };

  if (distValue) {
    options.dist = distValue;
  }

  Sentry.init(options);
};

/**
 * Sentry 활성화 여부 확인
 */
const isSentryEnabled = (): boolean => {
  const environment = process.env.EXPO_PUBLIC_ENV || 'production';
  return environment !== 'local';
};

/**
 * 에러를 Sentry에 수동으로 보고
 */
export const reportError = (error: Error, context?: Record<string, unknown>) => {
  if (!isSentryEnabled()) {
    console.log('[Sentry Disabled] Error:', error.message, context);
    return;
  }
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
};

/**
 * 사용자 정의 메시지를 Sentry에 보고
 */
export const reportMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (!isSentryEnabled()) {
    console.log(`[Sentry Disabled] Message (${level}):`, message);
    return;
  }
  Sentry.captureMessage(message, level);
};

/**
 * 사용자 컨텍스트 설정
 */
export const setUserContext = (userId: string, email: string, username: string) => {
  if (!isSentryEnabled()) {
    console.log('[Sentry Disabled] Set User Context:', { userId, email, username });
    return;
  }
  Sentry.setUser({
    id: userId,
    email: email,
    username: username,
  });
};

/**
 * 사용자 컨텍스트 제거 (로그아웃 시)
 */
export const clearUserContext = () => {
  if (!isSentryEnabled()) {
    console.log('[Sentry Disabled] Clear User Context');
    return;
  }
  Sentry.setUser(null);
};

/**
 * 커스텀 태그 추가
 */
export const addTag = (key: string, value: string) => {
  if (!isSentryEnabled()) {
    console.log('[Sentry Disabled] Add Tag:', { key, value });
    return;
  }
  Sentry.setTag(key, value);
};

/**
 * 커스텀 컨텍스트 추가
 */
export const addContext = (name: string, context: Record<string, unknown>) => {
  if (!isSentryEnabled()) {
    console.log('[Sentry Disabled] Add Context:', { name, context });
    return;
  }
  Sentry.setContext(name, context);
};

/**
 * Breadcrumb 추가 (디버깅용 이벤트 추적)
 */
export const addBreadcrumb = (message: string, category: string, data?: Record<string, unknown>) => {
  if (!isSentryEnabled()) {
    console.log('[Sentry Disabled] Add Breadcrumb:', { message, category, data });
    return;
  }
  const breadcrumb: Sentry.Breadcrumb = {
    message,
    category,
    level: 'info',
  };
  if (data) {
    breadcrumb.data = data;
  }
  Sentry.addBreadcrumb(breadcrumb);
};

export { Sentry };
