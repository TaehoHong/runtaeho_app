import { t, useAppLanguage } from '~/i18n';
import { Alert } from 'react-native';

/**
 * 에러 레벨 정의
 */
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 에러 타입 정의
 */
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  SERVER = 'server',
  BUSINESS_LOGIC = 'business_logic',
  UNKNOWN = 'unknown',
}

/**
 * 에러 정보 인터페이스
 */
export interface ErrorInfo {
  type: ErrorType;
  level: ErrorLevel;
  message: string;
  originalError?: any;
  context?: Record<string, any>;
  timestamp: number;
}

/**
 * Error Service
 * 앱 전체의 에러 처리를 담당하는 서비스
 */
export class ErrorService {
  private static instance: ErrorService;
  private errorHistory: ErrorInfo[] = [];
  private maxHistorySize = 100;

  private constructor() {}

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * 에러 처리 메인 메서드
   */
  handleError(
    error: any,
    context?: Record<string, any>,
    showToUser: boolean = true
  ): ErrorInfo {
    const errorInfo = this.parseError(error, context);
    this.logError(errorInfo);

    if (showToUser) {
      this.showErrorToUser(errorInfo);
    }

    return errorInfo;
  }

  /**
   * 에러 파싱 및 분류
   */
  private parseError(error: any, context?: Record<string, any>): ErrorInfo {
    let type = ErrorType.UNKNOWN;
    let level = ErrorLevel.ERROR;
    let message = t("알 수 없는 오류가 발생했습니다.");

    // Network 에러
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      type = ErrorType.NETWORK;
      level = ErrorLevel.WARNING;
      message = t('네트워크 연결을 확인해주세요.');
    }
    // HTTP 에러
    else if (error.status || error.response?.status) {
      const status = error.status || error.response?.status;

      if (status === 401) {
        type = ErrorType.AUTHENTICATION;
        level = ErrorLevel.WARNING;
        message = t('인증이 필요합니다. 다시 로그인해주세요.');
      } else if (status >= 400 && status < 500) {
        type = ErrorType.VALIDATION;
        level = ErrorLevel.WARNING;
        message = error.message || error.response?.data?.message || t("입력 정보를 확인해주세요.");
      } else if (status >= 500) {
        type = ErrorType.SERVER;
        level = ErrorLevel.ERROR;
        message = t('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
    // 비즈니스 로직 에러
    else if (error.type === 'BUSINESS_ERROR') {
      type = ErrorType.BUSINESS_LOGIC;
      level = ErrorLevel.INFO;
      message = error.message || t("처리할 수 없는 요청입니다.");
    }
    // 기타 에러
    else if (error.message) {
      message = error.message;
    }

    return {
      type,
      level,
      message,
      originalError: error,
      ...(context && { context }),
      timestamp: Date.now(),
    };
  }

  /**
   * 에러 로깅
   */
  private logError(errorInfo: ErrorInfo): void {
    // 에러 히스토리에 추가
    this.errorHistory.unshift(errorInfo);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }

    // 콘솔 로깅 (개발 환경에서만)
    if (__DEV__) {
      console.group(`🚨 Error [${errorInfo.level.toUpperCase()}] - ${errorInfo.type}`);
      console.error('Message:', errorInfo.message);
      console.error('Original Error:', errorInfo.originalError);
      console.error('Context:', errorInfo.context);
      console.error('Timestamp:', new Date(errorInfo.timestamp).toISOString());
      console.groupEnd();
    }

    // 크리티컬 에러는 추가 처리
    if (errorInfo.level === ErrorLevel.CRITICAL) {
      this.handleCriticalError(errorInfo);
    }
  }

  /**
   * 사용자에게 에러 표시
   */
  private showErrorToUser(errorInfo: ErrorInfo): void {
    switch (errorInfo.level) {
      case ErrorLevel.INFO:
        // Toast 메시지로 가볍게 표시
        this.showToast(errorInfo.message, 'info');
        break;

      case ErrorLevel.WARNING:
        // Toast 메시지로 표시
        this.showToast(errorInfo.message, 'warning');
        break;

      case ErrorLevel.ERROR:
        // Alert로 명확하게 표시
        Alert.alert(t("오류"), errorInfo.message, [{ text: t("확인") }]);
        break;

      case ErrorLevel.CRITICAL:
        // 크리티컬 에러는 앱 재시작 권유
        Alert.alert(
          t("심각한 오류"),
          t("앱에 심각한 문제가 발생했습니다. 앱을 다시 시작해주세요."),
          [
            { text: t("확인"), style: 'destructive' }
          ]
        );
        break;
    }
  }

  /**
   * Toast 메시지 표시 (구현 필요)
   */
  private showToast(message: string, type: 'info' | 'warning' | 'error'): void {
    // TODO: Toast 라이브러리 연동 후 구현
    // 예: react-native-toast-message 등
    console.log(`Toast [${type}]: ${message}`);
  }

  /**
   * 크리티컬 에러 처리
   */
  private handleCriticalError(errorInfo: ErrorInfo): void {
    // TODO: 크래시 리포팅 서비스 연동 (Firebase Crashlytics, Sentry 등)
    console.error('🔥 CRITICAL ERROR:', errorInfo);

    // 필요시 앱 상태 리셋 로직 추가
  }

  /**
   * 특정 타입의 에러만 필터링해서 반환
   */
  getErrorsByType(type: ErrorType): ErrorInfo[] {
    return this.errorHistory.filter(error => error.type === type);
  }

  /**
   * 최근 에러 히스토리 반환
   */
  getRecentErrors(limit: number = 10): ErrorInfo[] {
    return this.errorHistory.slice(0, limit);
  }

  /**
   * 에러 히스토리 클리어
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * 비즈니스 로직 에러 생성 유틸리티
   */
  static createBusinessError(message: string, context?: Record<string, any>): Error {
    const error = new Error(message);
    (error as any).type = 'BUSINESS_ERROR';
    (error as any).context = context;
    return error;
  }
}

/**
 * React Hook으로 ErrorService 사용
 */
export const useErrorHandler = () => {
  useAppLanguage();
  const errorService = ErrorService.getInstance();

  const handleError = (
    error: any,
    context?: Record<string, any>,
    showToUser: boolean = true
  ) => {
    return errorService.handleError(error, context, showToUser);
  };

  const handleBusinessError = (message: string, context?: Record<string, any>) => {
    const error = ErrorService.createBusinessError(message, context);
    return handleError(error, context);
  };

  return {
    handleError,
    handleBusinessError,
    getRecentErrors: () => errorService.getRecentErrors(),
    clearErrorHistory: () => errorService.clearErrorHistory(),
  };
};