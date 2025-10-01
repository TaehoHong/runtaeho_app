import { UserStateManager } from '../../../shared/services/userStateManager';
import { AuthError } from '../models/AuthError';
import { AuthProvider } from '../models/auth-types';
import { AuthenticationService } from '../services/AuthenticationService';
import { AuthStrategyFactory } from '../strategies/AuthStrategyFactory';
import { userService } from '../../../services/user/userService';

export class AuthViewModel {
  private userStateManager = UserStateManager.getInstance();
  private authService = AuthenticationService.shared;

  async signInWithGoogle(): Promise<{success: boolean; error?: AuthError}> {
    return this.signIn(AuthProvider.GOOGLE);
  }

  async signInWithApple(): Promise<{success: boolean; error?: AuthError}> {
    return this.signIn(AuthProvider.APPLE);
  }

  private async signIn(provider: AuthProvider): Promise<{success: boolean; error?: AuthError}> {
    try {
      const strategy = AuthStrategyFactory.getStrategy(provider);

      if (!strategy.isAvailable()) {
        return { success: false, error: AuthError.unavailable(`${provider} Sign-In not available`) };
      }

      // 인증 코드 및 사용자 정보 획득
      const authCodeResult = await strategy.getAuthorizationCode();

      // 백엔드 API를 통해 JWT 토큰 받기
      const tokenDto = await this.authService.getToken(
        provider,
        authCodeResult.authorizationCode
      );

      // 토큰을 사용하여 사용자 전체 데이터 조회
      const userData = await userService.getUserData();

      if (!userData) {
        throw AuthError.networkError('Failed to fetch user data');
      }

      // UserStateManager에 로그인 처리 (UserDataDto, accessToken, refreshToken)
      await this.userStateManager.login(
        userData,
        tokenDto.accessToken,
        tokenDto.refreshToken
      );

      return { success: true };
    } catch (error: any) {
      if (error instanceof AuthError) {
        return { success: false, error };
      }

      console.error(`${provider} Sign-In Error:`, error);
      return { success: false, error: AuthError.unknown(error.message || 'Unknown error') };
    }
  }

  async signOut(): Promise<void> {
    await this.userStateManager.logout();
  }

  get isLoggedIn(): boolean {
    return this.userStateManager.isLoggedIn;
  }
}