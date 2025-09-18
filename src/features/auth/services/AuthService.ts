import { AuthProvider, TokenDto } from '../types/AuthTypes';

class AuthenticationService {
  private baseURL = 'YOUR_API_BASE_URL'; // TODO: 실제 API URL로 변경

  async getToken(provider: AuthProvider, authCode: string): Promise<TokenDto> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: provider,
          code: authCode,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const tokenDto: TokenDto = await response.json();
      return tokenDto;
    } catch (error) {
      console.error('AuthService.getToken error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenDto> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Refresh': `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const tokenDto: TokenDto = await response.json();
      return tokenDto;
    } catch (error) {
      console.error('AuthService.refreshToken error:', error);
      throw error;
    }
  }
}

export const AuthService = new AuthenticationService();