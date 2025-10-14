/**
 * Storage Types
 * expo-secure-store 기반 보안 저장소 타입 정의
 */

export interface ISecureStorage {
  save(key: string, value: string, options?: SecureStorageOptions): Promise<void>;
  load(key: string): Promise<string | null>;
  remove(key: string): Promise<void>;
  isAvailable(): Promise<boolean>;
  clear(): Promise<void>;
}

export interface SecureStorageOptions {
  /**
   * iOS Keychain accessibility level
   * Android: 무시됨
   */
  keychainAccessible?: KeychainAccessibility;

  /**
   * 생체인증 요구 여부
   * iOS: Face ID/Touch ID
   * Android: Fingerprint/Face
   */
  requireAuthentication?: boolean;

  /**
   * 인증 프롬프트 메시지
   */
  authenticationPrompt?: string;
}

/**
 * iOS Keychain Accessibility Levels
 * https://developer.apple.com/documentation/security/keychain_services/keychain_items/item_attribute_keys_and_values#1679100
 */
export enum KeychainAccessibility {
  /**
   * 기기 잠금 해제 시 접근 가능
   * iCloud 백업 가능
   */
  WHEN_UNLOCKED = 'WHEN_UNLOCKED',

  /**
   * 기기 잠금 해제 시 접근 가능 (현재 기기만)
   * iCloud 백업 불가능
   * 권장: 토큰 등 민감한 데이터
   */
  WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',

  /**
   * 첫 잠금 해제 이후 항상 접근 가능
   * iCloud 백업 가능
   */
  AFTER_FIRST_UNLOCK = 'AFTER_FIRST_UNLOCK',

  /**
   * 첫 잠금 해제 이후 항상 접근 가능 (현재 기기만)
   * iCloud 백업 불가능
   */
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
}

/**
 * 생체인증 지원 정보
 */
export interface BiometricCapabilities {
  /**
   * 생체인증 사용 가능 여부
   */
  available: boolean;

  /**
   * 생체인증 타입
   */
  biometryType: BiometryType;
}

export type BiometryType = 'fingerprint' | 'face' | 'iris' | 'none';

/**
 * 토큰 저장소 인터페이스
 */
export interface ITokenStorage {
  saveTokens(accessToken: string, refreshToken?: string): Promise<void>;
  loadTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }>;
  clearTokens(): Promise<void>;
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
}
