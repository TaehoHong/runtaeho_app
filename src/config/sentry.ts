import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';

let navigationIntegration: ReturnType<typeof Sentry.reactNavigationIntegration> | undefined;

// The selected profile is authoritative; Metro can retain an older virtual env.
const getEnvironment = (): string => Constants.expoConfig?.extra?.env || process.env.EXPO_PUBLIC_ENV || 'production';

const safeDiagnosticData = (data?: Record<string, unknown>) => Object.fromEntries(
  Object.entries(data ?? {}).filter(([key, value]) =>
    ['type', 'method', 'status', 'operation', 'errorBoundary'].includes(key) &&
    (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'))
);

const sanitizeEvent = <T extends Sentry.Event>(event: T): T => {
  if (event.request) event.request = event.request.method ? { method: event.request.method } : {};
  if (event.user) event.user = event.user.id ? { id: event.user.id } : {};
  delete event.extra;
  if (event.contexts?.custom) event.contexts.custom = safeDiagnosticData(event.contexts.custom);
  return event;
};

export const registerSentryNavigationContainer = (ref: unknown) => {
  navigationIntegration?.registerNavigationContainer(ref);
};

/**
 * Sentry 초기화 설정
 */
export const initializeSentry = () => {
  const environment = getEnvironment();

  // local 환경에서는 Sentry 비활성화
  if (environment === 'local') {
    console.log('Sentry가 비활성화되었습니다. (profile=local)');
    return;
  }

  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!sentryDsn) {
    console.warn('Sentry DSN이 설정되지 않았습니다. 에러 리포팅이 비활성화됩니다.');
    return;
  }

  navigationIntegration = Sentry.reactNavigationIntegration();
  const options: Sentry.ReactNativeOptions = {
    dsn: sentryDsn,

    // 환경 설정 (EXPO_PUBLIC_ENV 기반)
    environment: environment,

    // 디버그 모드 (개발 환경에서만 활성화)
    debug: __DEV__,

    // release/dist는 SDK가 실제 설치된 네이티브 빌드에서 결정한다.
    initialScope: { tags: {
      'expo-update-id': Updates.updateId ?? 'embedded',
      'expo-runtime-version': Updates.runtimeVersion ?? 'unknown',
      'expo-channel': Updates.channel ?? 'unknown',
      'expo-is-embedded-update': Updates.isEmbeddedLaunch,
    } },

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
    sendDefaultPii: false,
    enableLogs: false,

    // 에러 필터링
    beforeSend(event, hint) {
      // 특정 에러 무시 (예: 네트워크 타임아웃)
      const error = hint.originalException as Error;
      if (error?.message?.includes('Network request failed')) {
        return null;
      }

      return sanitizeEvent(event);
    },
    beforeSendTransaction: sanitizeEvent,
    beforeSendSpan(span) {
      if (!span.op?.startsWith('http')) return span;
      return { ...span, description: 'HTTP request', data: Object.fromEntries(
        Object.entries(span.data ?? {}).filter(([key]) =>
          ['http.method', 'http.status_code', 'http.request.method', 'http.response.status_code'].includes(key))
      ) };
    },

    // Breadcrumb 필터링
    beforeBreadcrumb(breadcrumb) {
      // Console arguments are free-form objects and cannot be safely allowlisted.
      if (breadcrumb.category === 'console') return null;
      if (breadcrumb.type === 'http' || breadcrumb.category === 'http' || breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        return { ...breadcrumb, message: 'HTTP request', data: {
          method: breadcrumb.data?.method,
          status_code: breadcrumb.data?.status_code,
          operation: breadcrumb.data?.operation,
        } };
      }
      // Navigation params and other arbitrary SDK data may contain user input.
      return { ...breadcrumb, data: safeDiagnosticData(breadcrumb.data) };
    },

    // 통합 설정
    integrations: [
      // React Navigation 통합 (라우트 추적)
      navigationIntegration,
    ],
  };

  Sentry.init(options);
};

/**
 * Sentry 활성화 여부 확인
 */
export const isSentryEnabled = (): boolean => {
  const environment = getEnvironment();
  return environment !== 'local' && Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN);
};

/**
 * 에러를 Sentry에 수동으로 보고
 */
export const reportError = (error: Error, context?: Record<string, unknown>) => {
  if (!isSentryEnabled()) {
    console.log('[Sentry Disabled] Error');
    return;
  }
  Sentry.captureException(error, {
    ...(context?.type === 'api-error' ? {
      fingerprint: ['api-error', String(context.operation), String(context.status ?? 'transport')],
      tags: { operation: String(context.operation) },
    } : {}),
    contexts: {
      custom: safeDiagnosticData(context),
    },
  });
};

/**
 * 사용자 정의 메시지를 Sentry에 보고
 */
export const reportMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (!isSentryEnabled()) {
    console.log(`[Sentry Disabled] Message (${level})`);
    return;
  }
  Sentry.captureMessage(message, level);
};

/**
 * 사용자 컨텍스트 설정
 */
export const setUserContext = (userId: string) => {
  if (!isSentryEnabled()) {
    console.log('[Sentry Disabled] Set User Context');
    return;
  }
  Sentry.setUser({
    id: userId,
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
    console.log('[Sentry Disabled] Add Tag');
    return;
  }
  Sentry.setTag(key, value);
};

/**
 * 커스텀 컨텍스트 추가
 */
export const addContext = (name: string, context: Record<string, unknown>) => {
  if (!isSentryEnabled()) {
    console.log('[Sentry Disabled] Add Context');
    return;
  }
  Sentry.setContext(name, safeDiagnosticData(context));
};

/**
 * Breadcrumb 추가 (디버깅용 이벤트 추적)
 */
export const addBreadcrumb = (message: string, category: string, data?: Record<string, unknown>) => {
  if (!isSentryEnabled()) {
    console.log('[Sentry Disabled] Add Breadcrumb');
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
