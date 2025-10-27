import { Platform } from 'react-native';
import { type AuthCodeResult } from '../models/AuthResult';
import { AuthError } from '../models/AuthError';
import { type AuthProviderStrategy } from './AuthProviderStrategy';

let appleAuth: any = null;
if (Platform.OS === 'ios') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@invertase/react-native-apple-authentication');
  appleAuth = mod.appleAuth;
}

export class AppleAuthStrategy implements AuthProviderStrategy {
  configure(): void {
    // Apple Sign-In은 별도 설정 불필요
  }

  async getAuthorizationCode(): Promise<AuthCodeResult> {
    if (!this.isAvailable()) {
      throw AuthError.unavailable('Apple Sign-In not available');
    }

    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      if (appleAuthRequestResponse.authorizationCode) {
        console.log('Apple Sign-In 성공:', appleAuthRequestResponse.authorizationCode);

        return {
          authorizationCode: appleAuthRequestResponse.authorizationCode,
          userInfo: {
            name: appleAuthRequestResponse.fullName?.givenName ?? null,
            email: appleAuthRequestResponse.email ?? null,
          }
        };
      }

      throw AuthError.noAuthCode('No authorization code received');
    } catch (error: any) {
      if (error instanceof AuthError) {
        throw error;
      }

      if (error.code === appleAuth.Error.CANCELED) {
        throw AuthError.cancelled();
      } else {
        console.error('Apple Sign-In Error:', error);
        throw AuthError.unknown(error.message || 'Unknown error');
      }
    }
  }

  isAvailable(): boolean {
    return Platform.OS === 'ios' && appleAuth !== null;
  }
}
