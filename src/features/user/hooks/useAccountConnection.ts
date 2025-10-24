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

import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { AuthProviderType, getAuthProviderInfo } from '~/features/auth/models';
import { userService } from '~/services/user/userService';
import type { UserAccount } from '../models';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';

/**
 * 계정 연결 Hook
 */
export const useAccountConnection = () => {
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
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
      return;
    }

    if (isProviderConnected(AuthProviderType.GOOGLE)) {
      Alert.alert('알림', '이미 Google 계정이 연결되어 있습니다.');
      return;
    }

    try {
      setIsConnecting(true);
      console.log('🔗 [useAccountConnection] Google 계정 연결 시작');

      // Google Sign-In
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data?.serverAuthCode) {
        throw new Error('Google 인증 코드를 받을 수 없습니다.');
      }

      // 계정 연결 API 호출
      await userService.connectAccount(user.id, 'GOOGLE', userInfo.data?.serverAuthCode);

      // 사용자 데이터 갱신
      await refreshUserData();

      Alert.alert('성공', 'Google 계정이 연결되었습니다.');
      console.log('✅ [useAccountConnection] Google 계정 연결 완료');
    } catch (error: any) {
      console.error('❌ [useAccountConnection] Google 계정 연결 실패:', error);

      if (error.code === 'ACCOUNT_ALREADY_CONNECTED') {
        Alert.alert('알림', '이미 연결된 계정입니다.');
      } else if (error.code === 'ACCOUNT_ALREADY_IN_USE') {
        Alert.alert('오류', '다른 사용자가 이미 사용 중인 계정입니다.');
      } else {
        Alert.alert('오류', 'Google 계정 연결에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [user, isProviderConnected, refreshUserData]);

  /**
   * Apple 계정 연결
   */
  const connectAppleAccount = useCallback(async (): Promise<void> => {
    if (!user) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
      return;
    }

    if (isProviderConnected(AuthProviderType.APPLE)) {
      Alert.alert('알림', '이미 Apple 계정이 연결되어 있습니다.');
      return;
    }

    try {
      setIsConnecting(true);
      console.log('🔗 [useAccountConnection] Apple 계정 연결 시작');

      // Apple Sign-In
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });

      if (!credential.authorizationCode) {
        throw new Error('Apple 인증 코드를 받을 수 없습니다.');
      }

      // 계정 연결 API 호출
      await userService.connectAccount(user.id, 'APPLE', credential.authorizationCode);

      // 사용자 데이터 갱신
      await refreshUserData();

      Alert.alert('성공', 'Apple 계정이 연결되었습니다.');
      console.log('✅ [useAccountConnection] Apple 계정 연결 완료');
    } catch (error: any) {
      console.error('❌ [useAccountConnection] Apple 계정 연결 실패:', error);

      if (error.code === 'ERR_CANCELED') {
        // 사용자가 취소한 경우 - 아무것도 안 함
        return;
      }

      if (error.code === 'ACCOUNT_ALREADY_CONNECTED') {
        Alert.alert('알림', '이미 연결된 계정입니다.');
      } else if (error.code === 'ACCOUNT_ALREADY_IN_USE') {
        Alert.alert('오류', '다른 사용자가 이미 사용 중인 계정입니다.');
      } else {
        Alert.alert('오류', 'Apple 계정 연결에 실패했습니다. 다시 시도해주세요.');
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
        Alert.alert('오류', '지원하지 않는 계정 유형입니다.');
    }
  }, [connectGoogleAccount, connectAppleAccount]);

  /**
   * 계정 연결 해제
   */
  const disconnectAccount = useCallback(async (account: UserAccount): Promise<void> => {
    if (!user) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
      return;
    }

    // 마지막 계정인지 확인
    if (!canDisconnect(account.id)) {
      Alert.alert(
        '연결 해제 불가',
        '최소 1개의 계정 연결을 유지해야 합니다.\n다른 계정을 먼저 연결한 후 해제해주세요.',
        [{ text: '확인' }]
      );
      return;
    }

    const providerInfo = getAuthProviderInfo(account.provider);

    // 확인 다이얼로그
    Alert.alert(
      '계정 연결 해제',
      `${providerInfo.displayName} 계정 연결을 해제하시겠습니까?\n연결 해제 후에도 다시 연결할 수 있습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDisconnecting(true);
              console.log(`🔓 [useAccountConnection] ${providerInfo.displayName} 계정 연결 해제 시작`);

              // 계정 연결 해제 API 호출
              await userService.disconnectAccount(user.id, account.id);

              // 사용자 데이터 갱신
              await refreshUserData();

              Alert.alert('성공', `${providerInfo.displayName} 계정 연결이 해제되었습니다.`);
              console.log(`✅ [useAccountConnection] ${providerInfo.displayName} 계정 연결 해제 완료`);
            } catch (error: any) {
              console.error('❌ [useAccountConnection] 계정 연결 해제 실패:', error);

              if (error.response?.data?.code === 'LAST_ACCOUNT_CANNOT_DISCONNECT') {
                Alert.alert('오류', '마지막 계정은 해제할 수 없습니다.');
              } else if (error.response?.data?.code === 'ACCOUNT_NOT_FOUND') {
                Alert.alert('오류', '연결된 계정을 찾을 수 없습니다.');
              } else {
                Alert.alert('오류', '계정 연결 해제에 실패했습니다. 다시 시도해주세요.');
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
