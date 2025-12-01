/**
 * Biometric Storage
 * 생체인증 기반 보안 저장소
 *
 * iOS: Face ID / Touch ID
 * Android: Fingerprint / Face
 *
 * ⚠️ NOTE: expo-local-authentication 패키지 설치 필요
 * npm install expo-local-authentication
 */

// import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { secureStorage } from './SecureStorage';
import type { BiometricCapabilities, BiometryType } from './types';
import { SecureStorageError, SecureStorageErrorCode } from './errors';
import { KeychainAccessibility } from './types';

class BiometricStorageImpl {
  /**
   * 생체인증 지원 여부 및 타입 확인
   * ⚠️ expo-local-authentication 패키지 설치 후 사용 가능
   */
  async getBiometricCapabilities(): Promise<BiometricCapabilities> {
    // TODO: expo-local-authentication 패키지 설치 후 주석 해제
    console.warn('⚠️ [BiometricStorage] expo-local-authentication not installed yet');
    return { available: false, biometryType: 'none' };

    /*
    try {
      // 하드웨어 지원 확인
      const compatible = await LocalAuthentication.hasHardwareAsync();

      if (!compatible) {
        return { available: false, biometryType: 'none' };
      }

      // 생체인증 등록 여부 확인
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      if (!enrolled) {
        return { available: false, biometryType: 'none' };
      }

      // 지원하는 인증 타입 확인
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      const biometryType = this.determineBiometryType(types);

      return {
        available: true,
        biometryType,
      };
    } catch (error) {
      console.error(`❌ [BiometricStorage] Failed to get capabilities:`, error);
      return { available: false, biometryType: 'none' };
    }
    */
  }

  /**
   * 생체인증과 함께 데이터 저장
   */
  async saveWithBiometry(
    key: string,
    value: string,
    promptMessage?: string
  ): Promise<void> {
    const capabilities = await this.getBiometricCapabilities();

    if (!capabilities.available) {
      throw new SecureStorageError(
        SecureStorageErrorCode.BIOMETRY_NOT_AVAILABLE,
        'Biometric authentication not available on this device'
      );
    }

    // 생체인증 실행
    const authResult = await this.authenticate(promptMessage || '데이터를 안전하게 저장합니다');

    if (!authResult.success) {
      throw new SecureStorageError(
        SecureStorageErrorCode.AUTHENTICATION_FAILED,
        authResult.error || 'Biometric authentication failed'
      );
    }

    // 인증 성공 후 저장
    await secureStorage.save(key, value, {
      keychainAccessible: KeychainAccessibility.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      requireAuthentication: Platform.OS === 'android', // Android만 지원
      ...(promptMessage && { authenticationPrompt: promptMessage }),
    });

    console.log(`🔐 [BiometricStorage] Saved with biometry: ${key}`);
  }

  /**
   * 생체인증과 함께 데이터 로드
   */
  async loadWithBiometry(
    key: string,
    promptMessage?: string
  ): Promise<string | null> {
    const capabilities = await this.getBiometricCapabilities();

    if (!capabilities.available) {
      // 생체인증 불가능하면 일반 로드로 fallback
      console.warn(`⚠️ [BiometricStorage] Biometry not available, falling back to normal load`);
      return await secureStorage.load(key);
    }

    // 생체인증 실행
    const authResult = await this.authenticate(promptMessage || '데이터에 접근합니다');

    if (!authResult.success) {
      throw new SecureStorageError(
        SecureStorageErrorCode.AUTHENTICATION_FAILED,
        authResult.error || 'Biometric authentication failed'
      );
    }

    // 인증 성공 후 로드
    const value = await secureStorage.load(key);

    if (value) {
      console.log(`🔐 [BiometricStorage] Loaded with biometry: ${key}`);
    }

    return value;
  }

  /**
   * 생체인증 실행
   * ⚠️ expo-local-authentication 패키지 설치 후 사용 가능
   */
  private async authenticate(promptMessage: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    // TODO: expo-local-authentication 패키지 설치 후 주석 해제
    return { success: false, error: 'LocalAuthentication not installed' };

    /*
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: Platform.OS === 'ios' ? '암호 사용' : undefined,
        cancelLabel: '취소',
        disableDeviceFallback: false, // 기기 암호로 fallback 허용
      });

      if (result.success) {
        return { success: true };
      }

      // 인증 실패 또는 취소
      return {
        success: false,
        error: result.error || 'Authentication was cancelled or failed',
      };
    } catch (error) {
      console.error(`❌ [BiometricStorage] Authentication error:`, error);
      return {
        success: false,
        error: String(error),
      };
    }
    */
  }

  /**
   * 생체인증 타입 결정
   * ⚠️ expo-local-authentication 패키지 설치 후 사용 가능
   */
  private determineBiometryType(
    types: any[] // LocalAuthentication.AuthenticationType[]
  ): BiometryType {
    // TODO: expo-local-authentication 패키지 설치 후 주석 해제
    return 'none';

    /*
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'face';
    }

    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }

    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris';
    }

    return 'none';
    */
  }

  /**
   * 사용자 친화적 생체인증 타입 이름
   */
  getBiometryTypeName(type: BiometryType): string {
    switch (type) {
      case 'face':
        return Platform.OS === 'ios' ? 'Face ID' : '얼굴 인식';
      case 'fingerprint':
        return Platform.OS === 'ios' ? 'Touch ID' : '지문 인식';
      case 'iris':
        return '홍채 인식';
      default:
        return '생체인증';
    }
  }
}

/**
 * Singleton instance export
 */
export const biometricStorage = new BiometricStorageImpl();
