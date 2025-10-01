/**
 * Silent Token Refresh Service
 * SwiftUI SilentTokenRefreshService와 동일
 */

export type TokenStatus = 'valid' | 'expiringSoon' | 'expired' | 'noToken';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class SilentTokenRefreshService {
  private static instance: SilentTokenRefreshService;
  
  // 토큰 만료 전 갱신할 시간 (5분)
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60; // 5 minutes in seconds
  
  // 최대 재시도 횟수
  private readonly MAX_RETRY_COUNT = 3;
  
  private constructor() {}
  
  static getInstance(): SilentTokenRefreshService {
    if (!SilentTokenRefreshService.instance) {
      SilentTokenRefreshService.instance = new SilentTokenRefreshService();
    }
    return SilentTokenRefreshService.instance;
  }
  
  /**
   * 토큰 상태 확인
   * SwiftUI SilentTokenRefreshService.checkTokenStatus와 동일
   */
  checkTokenStatus(token?: string | null): TokenStatus {
    if (!token) {
      return 'noToken';
    }
    
    try {
      const payload = this.parseTokenPayload(token);
      if (!payload || !payload.exp) {
        return 'expired';
      }
      
      const currentTime = Date.now() / 1000;
      const expirationTime = payload.exp;
      const timeUntilExpiry = expirationTime - currentTime;
      
      if (timeUntilExpiry <= 0) {
        return 'expired';
      }
      
      if (timeUntilExpiry <= this.TOKEN_REFRESH_THRESHOLD) {
        return 'expiringSoon';
      }
      
      return 'valid';
    } catch (error) {
      console.error('❌ [SilentTokenRefreshService] Failed to check token status:', error);
      return 'expired';
    }
  }
  
  /**
   * Silent 토큰 갱신 수행
   * SwiftUI SilentTokenRefreshService.performSilentRefresh와 동일
   */
  async performSilentRefresh(): Promise<TokenPair> {
    let retryCount = 0;
    let lastError: Error | null = null;
    
    while (retryCount < this.MAX_RETRY_COUNT) {
      try {
        console.log(`🔄 [SilentTokenRefreshService] Refresh attempt ${retryCount + 1}/${this.MAX_RETRY_COUNT}`);
        
        // 백엔드에 refresh 요청
        const response = await this.refreshTokensFromBackend();
        
        if (response) {
          console.log('✅ [SilentTokenRefreshService] Token refresh successful');
          return response;
        }
      } catch (error: any) {
        lastError = error;
        console.error(`❌ [SilentTokenRefreshService] Refresh attempt ${retryCount + 1} failed:`, error);
        
        if (error.message === 'RefreshTokenExpired') {
          throw error;
        }
        
        retryCount++;
        
        if (retryCount < this.MAX_RETRY_COUNT) {
          // 재시도 전 대기 (exponential backoff)
          const waitTime = Math.pow(2, retryCount) * 1000;
          console.log(`⏳ [SilentTokenRefreshService] Waiting ${waitTime}ms before retry`);
          await this.delay(waitTime);
        }
      }
    }
    
    throw new Error('MaxRetryExceeded');
  }
  
  /**
   * 백엔드에서 토큰 갱신
   */
  private async refreshTokensFromBackend(): Promise<TokenPair> {
    // userStateManager에서 refreshToken 가져오기
    const { userStateManager } = await import('../../../shared/services/userStateManager');
    const refreshToken = userStateManager.refreshToken;
    
    if (!refreshToken) {
      throw new Error('RefreshTokenNotFound');
    }
    
    // API 호출
    const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('RefreshTokenExpired');
      }
      throw new Error(`RefreshFailed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.accessToken || !data.refreshToken) {
      throw new Error('InvalidRefreshResponse');
    }
    
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  }
  
  /**
   * JWT 토큰 페이로드 파싱
   */
  private parseTokenPayload(token: string): any {
    try {
      const components = token.split('.');
      if (components.length !== 3) return null;
      
      const payload = components[1];
      
      // Base64 URL 디코딩
      let base64 = payload
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      const remainder = base64.length % 4;
      if (remainder > 0) {
        base64 = base64.padEnd(base64.length + 4 - remainder, '=');
      }
      
      const decoded = atob(base64);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to parse token payload:', error);
      return null;
    }
  }
  
  /**
   * 지연 유틸리티
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 토큰이 곧 만료되는지 확인
   * @param token JWT 토큰
   * @param thresholdSeconds 만료 전 체크할 시간 (초)
   */
  isTokenExpiringSoon(token: string, thresholdSeconds: number = 300): boolean {
    const status = this.checkTokenStatus(token);
    return status === 'expiringSoon' || status === 'expired';
  }
  
  /**
   * 토큰 만료 시간 가져오기
   */
  getTokenExpirationTime(token: string): Date | null {
    try {
      const payload = this.parseTokenPayload(token);
      if (!payload || !payload.exp) {
        return null;
      }
      
      return new Date(payload.exp * 1000);
    } catch (error) {
      console.error('Failed to get token expiration time:', error);
      return null;
    }
  }
  
  /**
   * 토큰 남은 시간 (초)
   */
  getTokenRemainingTime(token: string): number {
    try {
      const payload = this.parseTokenPayload(token);
      if (!payload || !payload.exp) {
        return 0;
      }
      
      const currentTime = Date.now() / 1000;
      const remainingTime = payload.exp - currentTime;
      
      return Math.max(0, remainingTime);
    } catch (error) {
      console.error('Failed to get token remaining time:', error);
      return 0;
    }
  }
}

// Singleton export
export const silentTokenRefreshService = SilentTokenRefreshService.getInstance();