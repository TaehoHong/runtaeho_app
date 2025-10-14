/**
 * Secure Storage Module
 * expo-secure-store 기반 통합 저장소
 *
 * @example
 * ```typescript
 * import { tokenStorage, secureStorage, biometricStorage } from '~/utils/storage';
 *
 * // 토큰 저장
 * await tokenStorage.saveTokens(accessToken, refreshToken);
 *
 * // 토큰 로드
 * const { accessToken } = await tokenStorage.loadTokens();
 *
 * // 생체인증과 함께 저장
 * await biometricStorage.saveWithBiometry('sensitive', 'data');
 * ```
 */

// ===== Type Exports =====
export type {
  ISecureStorage,
  ITokenStorage,
  SecureStorageOptions,
  BiometricCapabilities,
  BiometryType,
} from './types';

export { KeychainAccessibility } from './types';

// ===== Error Exports =====
export { SecureStorageError, SecureStorageErrorCode } from './errors';

// ===== Core Storage Exports =====
export { secureStorage } from './SecureStorage';
export { biometricStorage } from './BiometricStorage';

// ===== Token Storage Constants =====

/**
 * 토큰 저장 키 상수
 */
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

// ===== Token Storage Helper =====

import { secureStorage } from './SecureStorage';
import type { ITokenStorage } from './types';

/**
 * 토큰 전용 저장소 헬퍼
 * 토큰 저장/로드/삭제를 간편하게 처리
 */
class TokenStorageImpl implements ITokenStorage {
  /**
   * 액세스 토큰과 리프레시 토큰 저장
   */
  async saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      await secureStorage.save(TOKEN_KEYS.ACCESS_TOKEN, accessToken);

      if (refreshToken) {
        await secureStorage.save(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
      }

      console.log(`🔐 [TokenStorage] Saved tokens`);
    } catch (error) {
      console.error(`❌ [TokenStorage] Failed to save tokens:`, error);
      throw error;
    }
  }

  /**
   * 액세스 토큰과 리프레시 토큰 로드
   */
  async loadTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
  }> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        secureStorage.load(TOKEN_KEYS.ACCESS_TOKEN),
        secureStorage.load(TOKEN_KEYS.REFRESH_TOKEN),
      ]);

      return { accessToken, refreshToken };
    } catch (error) {
      console.error(`❌ [TokenStorage] Failed to load tokens:`, error);
      return { accessToken: null, refreshToken: null };
    }
  }

  /**
   * 모든 토큰 삭제
   */
  async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        secureStorage.remove(TOKEN_KEYS.ACCESS_TOKEN),
        secureStorage.remove(TOKEN_KEYS.REFRESH_TOKEN),
      ]);

      console.log(`🔐 [TokenStorage] Cleared all tokens`);
    } catch (error) {
      console.error(`❌ [TokenStorage] Failed to clear tokens:`, error);
      throw error;
    }
  }

  /**
   * 액세스 토큰만 조회
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await secureStorage.load(TOKEN_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error(`❌ [TokenStorage] Failed to get access token:`, error);
      return null;
    }
  }

  /**
   * 리프레시 토큰만 조회
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await secureStorage.load(TOKEN_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error(`❌ [TokenStorage] Failed to get refresh token:`, error);
      return null;
    }
  }

  /**
   * 액세스 토큰만 업데이트
   */
  async updateAccessToken(accessToken: string): Promise<void> {
    try {
      await secureStorage.save(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
      console.log(`🔐 [TokenStorage] Updated access token`);
    } catch (error) {
      console.error(`❌ [TokenStorage] Failed to update access token:`, error);
      throw error;
    }
  }

  /**
   * 토큰 존재 여부 확인
   */
  async hasTokens(): Promise<boolean> {
    try {
      const { accessToken, refreshToken } = await this.loadTokens();
      return !!(accessToken || refreshToken);
    } catch (error) {
      return false;
    }
  }
}

/**
 * 토큰 저장소 싱글톤 인스턴스
 */
export const tokenStorage = new TokenStorageImpl();
