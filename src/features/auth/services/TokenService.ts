export const TokenStatus = {
  VALID: 1, 
  SOON_EXPIRING: 2,
  EXPIRED: 3,
  NO_TOKEN: 4
} as const


export class TokenService {
  private static instance: TokenService;
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60; // 5 minutes in seconds

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }
  
  isTokenExpiringSoon(token: string, thresholdSeconds: number = 300): boolean {
    let expiringTime = this.getTokenExpringTime(token) - Date.now() / 1000 
    return expiringTime <= thresholdSeconds;
  }

  verifyToken(token: string): typeof TokenStatus[keyof typeof TokenStatus] {
    try {
      const payload = this.parseTokenPayload(token);
      if (!payload || !payload.exp) {
        return TokenStatus.EXPIRED;
      }
      
      const currentTime = Date.now() / 1000;
      const expirationTime = payload.exp;
      const timeUntilExpiry = expirationTime - currentTime;
      
      if (timeUntilExpiry <= 0) {
        return TokenStatus.EXPIRED;
      }
      
      if (timeUntilExpiry <= this.TOKEN_REFRESH_THRESHOLD) {
        return TokenStatus.SOON_EXPIRING;
      }
      
      return TokenStatus.VALID;
    } catch (error) {
      console.error('❌ [SilentTokenRefreshService] Failed to check token status:', error);
      return TokenStatus.EXPIRED;
    }
  }

  getTokenExpringTime(token: string): number {
    const payload = this.parseTokenPayload(token);
    if (!payload) return 0;
    return payload.exp;
  }

  /**
   * JWT 토큰 페이로드 파싱
   */
  private parseTokenPayload(token: string): any {
    try {
      const components = token.split('.');
      if (components.length !== 3) return null;
      
      const payload = components[1];
      
      if (!payload) return null;
      
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

  private constructor() {}
}

