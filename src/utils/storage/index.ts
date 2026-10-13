/**
 * Secure Storage Module
 * expo-secure-store 기반 통합 저장소
 *
 * @example
 * ```typescript
 * import { tokenStorage, secureStorage } from '~/utils/storage';
 *
 * // 토큰 저장
 * await tokenStorage.saveTokens(accessToken, refreshToken);
 *
 * // 토큰 로드
 * const { accessToken } = await tokenStorage.loadTokens();
 * ```
 */

import { secureStorage } from './SecureStorage';
import type { ITokenStorage, TokenWriteOptions } from './types';
import { SessionSupersededError, SecureStorageError, SecureStorageErrorCode } from './errors';

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

// ===== Token Storage Constants =====

/**
 * 토큰 저장 키 상수
 */
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

// ===== Token Storage Helper =====

/**
 * 토큰 전용 저장소 헬퍼
 * 토큰 저장/로드/삭제를 간편하게 처리
 */
class TokenStorageImpl implements ITokenStorage {
  private tail: Promise<unknown> = Promise.resolve();

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation);
    this.tail = result.catch(() => undefined);
    return result;
  }

  private async read() {
    const [accessToken, refreshToken] = await Promise.all([
      secureStorage.load(TOKEN_KEYS.ACCESS_TOKEN),
      secureStorage.load(TOKEN_KEYS.REFRESH_TOKEN),
    ]);
    return { accessToken, refreshToken };
  }

  async saveTokens(accessToken: string, refreshToken?: string, options?: TokenWriteOptions): Promise<void> {
    return this.enqueue(async () => {
      const assertCurrent = () => {
        if (options?.isCurrent && !options.isCurrent()) throw new SessionSupersededError();
      };
      assertCurrent();
      const previous = await this.read();
      assertCurrent();
      try {
        await secureStorage.save(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
        if (refreshToken !== undefined) await secureStorage.save(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
        assertCurrent();
      } catch (error) {
        // Keep the legacy key format for OTA rollback. This compensates failed
        // writes in-process; two Keychain writes are not crash-atomic.
        const restored = await Promise.allSettled([
          previous.accessToken === null
            ? secureStorage.remove(TOKEN_KEYS.ACCESS_TOKEN)
            : secureStorage.save(TOKEN_KEYS.ACCESS_TOKEN, previous.accessToken),
          previous.refreshToken === null
            ? secureStorage.remove(TOKEN_KEYS.REFRESH_TOKEN)
            : secureStorage.save(TOKEN_KEYS.REFRESH_TOKEN, previous.refreshToken),
        ]);
        if (restored.some(result => result.status === 'rejected')) {
          throw new SecureStorageError(SecureStorageErrorCode.SAVE_FAILED, 'Token rollback failed');
        }
        throw error;
      }
      options?.onCommit?.();
    });
  }

  loadTokens() { return this.enqueue(() => this.read()); }

  clearTokens(): Promise<void> {
    return this.enqueue(async () => {
      const results = await Promise.allSettled([
        secureStorage.remove(TOKEN_KEYS.ACCESS_TOKEN),
        secureStorage.remove(TOKEN_KEYS.REFRESH_TOKEN),
      ]);
      if (results.some(result => result.status === 'rejected')) {
        throw new SecureStorageError(SecureStorageErrorCode.DELETE_FAILED, 'Token deletion failed');
      }
    });
  }

  async getAccessToken(): Promise<string | null> { return (await this.loadTokens()).accessToken; }
  async getRefreshToken(): Promise<string | null> { return (await this.loadTokens()).refreshToken; }
  updateAccessToken(accessToken: string): Promise<void> { return this.saveTokens(accessToken); }
  async hasTokens(): Promise<boolean> {
    const pair = await this.loadTokens();
    return !!(pair.accessToken || pair.refreshToken);
  }
}

/**
 * 토큰 저장소 싱글톤 인스턴스
 */
export const tokenStorage = new TokenStorageImpl();
