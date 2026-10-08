import { t, useAppLanguage } from '~/i18n';
/**
 * useAccountConnection Hook
 *
 * 계정 연결/해제 로직을 관리하는 Custom Hook
 *
 * 책임:
 * - 계정 연결 가능 여부 확인
 * - 계정 연결 해제 가능 여부 확인
 * - OAuth 플로우 실행 및 계정 연결
 * - 계정 연결 해제
 * - 사용자 데이터 자동 갱신
 */

import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { AuthError, AuthErrorType } from '~/features/auth/models/AuthError';
import { AuthProviderType, getAuthProviderInfo } from '~/features/auth/models';
import { GoogleAuthStrategy } from '~/features/auth/strategies/GoogleAuthStrategy';
import { userService } from '~/features/user/services/userService';
import type { UserAccount } from '../models';

let appleAuth: any = null;
if (Platform.OS === 'ios') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@invertase/react-native-apple-authentication');
  appleAuth = mod.appleAuth;
}

/**
 * 계정 연결 Hook
 */
export const useAccountConnection = () => {
  useAppLanguage();
  const { user, refreshUserData } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  /**
   * 연결된 계정 목록
   */
  const connectedAccounts = useMemo(() => {
    return user?.userAccounts.filter(acc => acc.isConnected) || [];
  }, [user?.userAccounts]);

  /**
   * Provider별 계정 정보
   */
  const getAccountByProvider = useCallback((provider: AuthProviderType): UserAccount | undefined => {
    return user?.userAccounts.find(acc => acc.provider === provider && acc.isConnected);
  }, [user?.userAccounts]);

  /**
   * 계정 연결 해제 가능 여부 확인
   * 최소 1개의 계정은 유지해야 함
   */
  const canDisconnect = useCallback((accountId: number): boolean => {
    if (!user) return false;

    // 연결된 계정이 2개 이상일 때만 해제 가능
    const connected = connectedAccounts.length;
    return connected > 1;
  }, [user, connectedAccounts]);

  /**
   * Provider가 이미 연결되어 있는지 확인
   */
  const isProviderConnected = useCallback((provider: AuthProviderType): boolean => {
    return !!getAccountByProvider(provider);
  }, [getAccountByProvider]);

  /**
   * Google 계정 연결
   */
  const connectGoogleAccount = useCallback(async (): Promise<void> => {
    if (!user) {
      Alert.alert(t("오류"), t("사용자 정보를 찾을 수 없습니다."));
      return;
    }

    if (isProviderConnected(AuthProviderType.GOOGLE)) {
      Alert.alert(t("알림"), t("이미 Google 계정이 연결되어 있습니다."));
      return;
    }

    try {
      setIsConnecting(true);
      console.log('🔗 [useAccountConnection] Google 계정 연결 시작');

      // GoogleAuthStrategy 사용 (SPOT - configure() 호출로 offlineAccess 설정 보장)
      const googleStrategy = new GoogleAuthStrategy();
      googleStrategy.configure();
      const authResult = await googleStrategy.getAuthorizationCode();

      // 계정 연결 API 호출
      await userService.connectAccount(user.id, 'GOOGLE', authResult.authorizationCode);

      // 사용자 데이터 갱신
      await refreshUserData();

      Alert.alert(t("성공"), t("Google 계정이 연결되었습니다."));
      console.log('✅ [useAccountConnection] Google 계정 연결 완료');
    } catch (error: any) {
      console.error('❌ [useAccountConnection] Google 계정 연결 실패:', error);

      // AuthError 처리 (GoogleAuthStrategy에서 발생)
      if (error instanceof AuthError) {
        if (error.type === AuthErrorType.CANCELLED) {
          // 사용자가 취소한 경우 - 아무것도 안 함
          return;
        }
        Alert.alert(t("오류"), t("Google 계정 연결에 실패했습니다. 다시 시도해주세요."));
        return;
      }

      // API 에러 처리
      if (error.code === 'ACCOUNT_ALREADY_CONNECTED') {
        Alert.alert(t("알림"), t("이미 연결된 계정입니다."));
      } else if (error.code === 'ACCOUNT_ALREADY_IN_USE') {
        Alert.alert(t("오류"), t("다른 사용자가 이미 사용 중인 계정입니다."));
      } else {
        Alert.alert(t("오류"), t("Google 계정 연결에 실패했습니다. 다시 시도해주세요."));
      }
    } finally {
      setIsConnecting(false);
    }
  }, [user, isProviderConnected, refreshUserData]);

  /**
   * Apple 계정 연결 (iOS 전용)
   */
  const connectAppleAccount = useCallback(async (): Promise<void> => {
    if (!user) {
      Alert.alert(t("오류"), t("사용자 정보를 찾을 수 없습니다."));
      return;
    }

    if (Platform.OS !== 'ios') {
      Alert.alert(t("오류"), t("Apple 계정 연결은 iOS에서만 지원됩니다."));
      return;
    }

    if (isProviderConnected(AuthProviderType.APPLE)) {
      Alert.alert(t("알림"), t("이미 Apple 계정이 연결되어 있습니다."));
      return;
    }

    try {
      setIsConnecting(true);
      console.log('🔗 [useAccountConnection] Apple 계정 연결 시작');

      const credential = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      if (!credential.authorizationCode) {
        throw new Error(t("Apple 인증 코드를 받을 수 없습니다."));
      }

      // 계정 연결 API 호출
      await userService.connectAccount(user.id, 'APPLE', credential.authorizationCode);

      // 사용자 데이터 갱신
      await refreshUserData();

      Alert.alert(t("성공"), t("Apple 계정이 연결되었습니다."));
      console.log('✅ [useAccountConnection] Apple 계정 연결 완료');
    } catch (error: any) {
      console.error('❌ [useAccountConnection] Apple 계정 연결 실패:', error);

      if (error.code === 'ERR_CANCELED' || error.code === appleAuth?.Error?.CANCELED) {
        // 사용자가 취소한 경우 - 아무것도 안 함
        return;
      }

      if (error.code === 'ACCOUNT_ALREADY_CONNECTED') {
        Alert.alert(t("알림"), t("이미 연결된 계정입니다."));
      } else if (error.code === 'ACCOUNT_ALREADY_IN_USE') {
        Alert.alert(t("오류"), t("다른 사용자가 이미 사용 중인 계정입니다."));
      } else {
        Alert.alert(t("오류"), t("Apple 계정 연결에 실패했습니다. 다시 시도해주세요."));
      }
    } finally {
      setIsConnecting(false);
    }
  }, [user, isProviderConnected, refreshUserData]);

  /**
   * 계정 연결 (Provider에 따라 자동 분기)
   */
  const connectAccount = useCallback(async (provider: AuthProviderType): Promise<void> => {
    switch (provider) {
      case AuthProviderType.GOOGLE:
        await connectGoogleAccount();
        break;
      case AuthProviderType.APPLE:
        await connectAppleAccount();
        break;
      default:
        Alert.alert(t("오류"), t("지원하지 않는 계정 유형입니다."));
    }
  }, [connectGoogleAccount, connectAppleAccount]);

  /**
   * 계정 연결 해제
   */
  const disconnectAccount = useCallback(async (account: UserAccount): Promise<void> => {
    if (!user) {
      Alert.alert(t("오류"), t("사용자 정보를 찾을 수 없습니다."));
      return;
    }

    // 마지막 계정인지 확인
    if (!canDisconnect(account.id)) {
      Alert.alert(
        t("연결 해제 불가"),
        t("최소 1개의 계정 연결을 유지해야 합니다.\n다른 계정을 먼저 연결한 후 해제해주세요."),
        [{ text: t("확인") }]
      );
      return;
    }

    const providerInfo = getAuthProviderInfo(account.provider);

    // 확인 다이얼로그
    Alert.alert(
      t("계정 연결 해제"),
      t("{{value0}} 계정 연결을 해제하시겠습니까?\n연결 해제 후에도 다시 연결할 수 있습니다.", { value0: providerInfo.displayName }),
      [
        { text: t("취소"), style: 'cancel' },
        {
          text: t("해제"),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDisconnecting(true);
              console.log(`🔓 [useAccountConnection] ${providerInfo.displayName} 계정 연결 해제 시작`);

              // 계정 연결 해제 API 호출
              await userService.disconnectAccount(account.id);

              // 사용자 데이터 갱신
              await refreshUserData();

              Alert.alert(t("성공"), t("{{value0}} 계정 연결이 해제되었습니다.", { value0: providerInfo.displayName }));
              console.log(`✅ [useAccountConnection] ${providerInfo.displayName} 계정 연결 해제 완료`);
            } catch (error: any) {
              console.error('❌ [useAccountConnection] 계정 연결 해제 실패:', error);

              if (error.response?.data?.code === 'LAST_ACCOUNT_CANNOT_DISCONNECT') {
                Alert.alert(t("오류"), t("마지막 계정은 해제할 수 없습니다."));
              } else if (error.response?.data?.code === 'ACCOUNT_NOT_FOUND') {
                Alert.alert(t("오류"), t("연결된 계정을 찾을 수 없습니다."));
              } else {
                Alert.alert(t("오류"), t("계정 연결 해제에 실패했습니다. 다시 시도해주세요."));
              }
            } finally {
              setIsDisconnecting(false);
            }
          }
        }
      ]
    );
  }, [user, canDisconnect, refreshUserData]);

  return {
    // State
    connectedAccounts,
    isConnecting,
    isDisconnecting,

    // Computed
    canDisconnect,
    isProviderConnected,
    getAccountByProvider,

    // Actions
    connectAccount,
    disconnectAccount,
  };
};
