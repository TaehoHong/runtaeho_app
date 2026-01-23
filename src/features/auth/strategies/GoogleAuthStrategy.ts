import {
  GoogleSignin,
  statusCodes
} from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { type AuthCodeResult } from '../models/AuthResult';
import { AuthError } from '../models/AuthError';
import { type AuthProviderStrategy } from './AuthProviderStrategy';

export class GoogleAuthStrategy implements AuthProviderStrategy {
  configure(): void {
    const googleIosClientId = Constants.expoConfig?.extra?.googleIosClientId ||
                             '620303212609-581f7f3bgj104gtaermbtjqqf8u6khb8.apps.googleusercontent.com';
    const googleServerClientId = Constants.expoConfig?.extra?.googleServerClientId ||
                                 '620303212609-tqerha7lmhgr719hd8qsd09kualf72l9.apps.googleusercontent.com';
    const googleAndroidClientId = Constants.expoConfig?.extra?.googleAndroidClientId ||
                                  '620303212609-u26pmkbaiftnpjkfcls380c32n1ubruf.apps.googleusercontent.com';

    console.log('🔧 [DEBUG] Google 클라이언트 ID 설정:');
    console.log('  - iOS Client ID:', googleIosClientId);
    console.log('  - Server Client ID:', googleServerClientId);
    console.log('  - Android Client ID:', googleAndroidClientId);
    console.log('  - Constants.expoConfig?.extra:', Constants.expoConfig?.extra);

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
        console.log('Google Sign-In 성공:', userInfo.data.serverAuthCode);

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