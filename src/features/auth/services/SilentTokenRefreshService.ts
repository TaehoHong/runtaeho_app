export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class SilentTokenRefreshService {
  private static instance: SilentTokenRefreshService;
  
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
    const refreshToken = userStateManager.getRefreshToken();
    
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
   * 지연 유틸리티
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton export
export const silentTokenRefreshService = SilentTokenRefreshService.getInstance();