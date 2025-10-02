/**
 * Secure Storage Errors
 * 보안 저장소 에러 정의
 */

export enum SecureStorageErrorCode {
  /**
   * 보안 저장소를 사용할 수 없는 환경
   * 예: 에뮬레이터, 지원하지 않는 플랫폼
   */
  NOT_AVAILABLE = 'NOT_AVAILABLE',

  /**
   * 저장 실패
   */
  SAVE_FAILED = 'SAVE_FAILED',

  /**
   * 로드 실패
   */
  LOAD_FAILED = 'LOAD_FAILED',

  /**
   * 삭제 실패
   */
  DELETE_FAILED = 'DELETE_FAILED',

  /**
   * 생체인증 실패
   */
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',

  /**
   * 생체인증 미지원
   */
  BIOMETRY_NOT_AVAILABLE = 'BIOMETRY_NOT_AVAILABLE',

  /**
   * 데이터 마이그레이션 실패
   */
  MIGRATION_FAILED = 'MIGRATION_FAILED',

  /**
   * 기기 잠금 설정 필요
   */
  NO_DEVICE_LOCK = 'NO_DEVICE_LOCK',
}

/**
 * 보안 저장소 에러 클래스
 */
export class SecureStorageError extends Error {
  constructor(
    public readonly code: SecureStorageErrorCode,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'SecureStorageError';

    // Error 클래스 상속 시 프로토타입 체인 복원 (TypeScript)
    Object.setPrototypeOf(this, SecureStorageError.prototype);
  }

  /**
   * 사용자 친화적 에러 메시지
   */
  getUserMessage(): string {
    switch (this.code) {
      case SecureStorageErrorCode.NOT_AVAILABLE:
        return '보안 저장소를 사용할 수 없습니다. 기기 설정을 확인해주세요.';

      case SecureStorageErrorCode.SAVE_FAILED:
        return '데이터 저장에 실패했습니다. 다시 시도해주세요.';

      case SecureStorageErrorCode.LOAD_FAILED:
        return '데이터 불러오기에 실패했습니다.';

      case SecureStorageErrorCode.DELETE_FAILED:
        return '데이터 삭제에 실패했습니다.';

      case SecureStorageErrorCode.AUTHENTICATION_FAILED:
        return '인증에 실패했습니다. 다시 시도해주세요.';

      case SecureStorageErrorCode.BIOMETRY_NOT_AVAILABLE:
        return '생체인증을 사용할 수 없습니다. 기기 설정에서 Face ID 또는 Touch ID를 활성화해주세요.';

      case SecureStorageErrorCode.MIGRATION_FAILED:
        return '데이터 마이그레이션에 실패했습니다.';

      case SecureStorageErrorCode.NO_DEVICE_LOCK:
        return '기기 보안 설정이 필요합니다. 기기 잠금(PIN, 패턴, 비밀번호)을 설정해주세요.';

      default:
        return '알 수 없는 오류가 발생했습니다.';
    }
  }

  /**
   * 개발자용 상세 정보
   */
  getDebugInfo(): string {
    return `[${this.code}] ${this.message}${
      this.originalError ? `\nOriginal: ${String(this.originalError)}` : ''
    }`;
  }
}
