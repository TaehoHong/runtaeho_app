import {
  GoogleSignin,
  statusCodes
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { UserStateManager } from '../../../shared/services/user-state-manager';
import { UserAuthData, AuthProvider } from '../models/auth-types';
import { AuthenticationService } from '../services/authentication-service';

let appleAuth: any = null;
if (Platform.OS === 'ios') {
  const mod = require('@invertase/react-native-apple-authentication');
  appleAuth = mod.appleAuth;
}

export class AuthViewModel {
  private userStateManager = UserStateManager.getInstance();
  private authService = AuthenticationService.shared;

  constructor() {
    this.configureGoogleSignIn();
  }

  private configureGoogleSignIn() {
    GoogleSignin.configure({
      iosClientId: '620303212609-581f7f3bgj104gtaermbtjqqf8u6khb8.apps.googleusercontent.com',
      webClientId: '620303212609-tqerha7lmhgr719hd8qsd09kualf72l7.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }

  async signInWithGoogle(): Promise<{success: boolean; error?: string}> {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.data?.serverAuthCode) {
        console.log('Google Sign-In 성공:', userInfo.data.serverAuthCode);

        // 백엔드 API를 통해 JWT 토큰 받기
        const tokenDto = await this.authService.getToken(
          AuthProvider.GOOGLE,
          userInfo.data.serverAuthCode
        );

        // UserAuthData 형태로 변환하여 로그인 처리
        const userData: UserAuthData = {
          accessToken: tokenDto.accessToken,
          refreshToken: tokenDto.refreshToken,
          nickname: userInfo.data.user.name || 'Google User',
          email: userInfo.data.user.email,
          profileImage: userInfo.data.user.photo,
          provider: 'GOOGLE',
          userId: tokenDto.userId.toString()
        };

        await this.userStateManager.login(userData);
        return { success: true };
      }

      return { success: false, error: 'No server auth code received' };
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { success: false, error: 'Sign in cancelled' };
      } else if (error.code === statusCodes.IN_PROGRESS) {
        return { success: false, error: 'Sign in already in progress' };
      } else {
        console.error('Google Sign-In Error:', error);
        return { success: false, error: error.message || 'Unknown error' };
      }
    }
  }

  async signInWithApple(): Promise<{success: boolean; error?: string}> {
    if (Platform.OS !== 'ios' || !appleAuth) {
      return { success: false, error: 'Apple Sign-In not available' };
    }

    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      if (appleAuthRequestResponse.authorizationCode) {
        console.log('Apple Sign-In 성공:', appleAuthRequestResponse.authorizationCode);

        // 백엔드 API를 통해 JWT 토큰 받기
        const tokenDto = await this.authService.getToken(
          AuthProvider.APPLE,
          appleAuthRequestResponse.authorizationCode
        );

        // UserAuthData 형태로 변환하여 로그인 처리
        const userData: UserAuthData = {
          accessToken: tokenDto.accessToken,
          refreshToken: tokenDto.refreshToken,
          nickname: appleAuthRequestResponse.fullName?.givenName || 'Apple User',
          email: appleAuthRequestResponse.email,
          provider: 'APPLE',
          userId: tokenDto.userId.toString()
        };

        await this.userStateManager.login(userData);
        return { success: true };
      }

      return { success: false, error: 'No authorization code received' };
    } catch (error: any) {
      if (error.code === appleAuth.Error.CANCELED) {
        return { success: false, error: 'Sign in cancelled' };
      } else {
        console.error('Apple Sign-In Error:', error);
        return { success: false, error: error.message || 'Unknown error' };
      }
    }
  }

  async signOut(): Promise<void> {
    await this.userStateManager.logout();
  }

  get isLoggedIn(): boolean {
    return this.userStateManager.currentState.isLoggedIn;
  }
}