import {
  GoogleSignin,
  statusCodes
} from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { type AuthCodeResult } from '../models/AuthResult';
import { AuthError } from '../models/AuthError';
import { type AuthProviderStrategy } from './AuthProviderStrategy';

const getConfigValue = (
  extraValue: unknown,
  envValue: string | undefined
): string | undefined => {
  if (typeof extraValue === 'string' && extraValue.trim().length > 0) {
    return extraValue;
  }

  if (envValue && envValue.trim().length > 0) {
    return envValue;
  }

  return undefined;
};

export class GoogleAuthStrategy implements AuthProviderStrategy {
  configure(): void {
    const extra = Constants.expoConfig?.extra;
    const googleIosClientId = getConfigValue(
      extra?.googleIosClientId,
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    );
    const googleServerClientId = getConfigValue(
      extra?.googleServerClientId,
      process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID
    );

    if (!googleServerClientId) {
      throw AuthError.unavailable(
        'Google 로그인 설정이 누락되었습니다. 앱을 최신 상태로 업데이트한 뒤 다시 시도해주세요.'
      );
    }

    GoogleSignin.configure({
      iosClientId: googleIosClientId,
      webClientId: googleServerClientId,
      offlineAccess: true,
    });
  }

  async getAuthorizationCode(): Promise<AuthCodeResult> {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.data?.serverAuthCode) {
        console.log('Google Sign-In 성공');

        return {
          authorizationCode: userInfo.data.serverAuthCode,
          userInfo: {
            name: userInfo.data.user.name,
            email: userInfo.data.user.email,
          }
        };
      }

      throw AuthError.noAuthCode('No server auth code received');
    } catch (error: any) {
      if (error instanceof AuthError) {
        throw error;
      }

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw AuthError.cancelled();
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw AuthError.inProgress();
      } else {
        console.error('Google Sign-In Error:', error);
        throw AuthError.unknown(error.message || 'Unknown error');
      }
    }
  }

  isAvailable(): boolean {
    return true;
  }

  async logout(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      console.log('✅ [GoogleAuthStrategy] Google Sign-Out 완료');
    } catch (error) {
      console.error('❌ [GoogleAuthStrategy] Google Sign-Out 실패:', error);
      // 실패해도 앱 로그아웃은 진행되어야 하므로 에러를 throw하지 않음
    }
  }
}
