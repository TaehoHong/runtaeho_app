import { API_CONFIG } from '~/services/api/config';
import { tokenStorage } from '~/utils/storage';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class RefreshTokenExpiredError extends Error {
  constructor() { super('RefreshTokenExpired'); this.name = 'RefreshTokenExpiredError'; }
}

export class SilentTokenRefreshService {
  private static instance: SilentTokenRefreshService;
  private readonly MAX_RETRY_COUNT = 3;
  private constructor() {}

  static getInstance(): SilentTokenRefreshService {
    if (!this.instance) this.instance = new SilentTokenRefreshService();
    return this.instance;
  }

  static resetForTest(): void { this.instance = new SilentTokenRefreshService(); }

  async performSilentRefresh(refreshToken?: string): Promise<TokenPair> {
    // One flight must never switch to another account's token between retries.
    const token = refreshToken ?? await tokenStorage.getRefreshToken();
    if (!token) throw new Error('RefreshTokenNotFound');
    for (let attempt = 1; attempt <= this.MAX_RETRY_COUNT; attempt++) {
      try {
        return await this.refreshTokens(token);
      } catch (error) {
        if (error instanceof RefreshTokenExpiredError ||
            (error instanceof Error && error.message === 'RefreshTokenExpired')) throw error;
        console.warn('[AuthRefresh] transient failure', { attempt });
        if (attempt < this.MAX_RETRY_COUNT) await this.delay(2 ** attempt * 1000);
      }
    }
    throw new Error('MaxRetryExceeded');
  }

  private async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Refresh: `Bearer ${refreshToken}` },
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) throw new RefreshTokenExpiredError();
      if (!response.ok) throw new Error('RefreshFailed');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' ||
          !('accessToken' in data) || typeof data.accessToken !== 'string' || !data.accessToken ||
          !('refreshToken' in data) || typeof data.refreshToken !== 'string' || !data.refreshToken) {
        throw new Error('InvalidRefreshResponse');
      }
      return { accessToken: data.accessToken, refreshToken: data.refreshToken };
    } finally { clearTimeout(timeout); }
  }

  private delay(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}

export const silentTokenRefreshService = SilentTokenRefreshService.getInstance();
