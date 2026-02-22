/**
 * 연결 계정 관리 화면
 * Figma: #4_마이페이지_서비스_연결계정관리
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { TopScreenSafeAreaView } from '~/shared/components';
import { Text } from '~/shared/components/typography';
import { GREY } from '~/shared/styles';
import { AuthProviderType, getAuthProviderInfo } from '~/features/auth/models';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { useAccountConnection } from '../hooks/useAccountConnection';
import { getConnectionButtonColor, AccountConnectionStatus } from '../models/UserAccount';
import { Ionicons } from '@expo/vector-icons';

/**
 * 연결 계정 관리 화면
 */
export const AccountConnectionView: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const {
    connectedAccounts,
    isConnecting,
    isDisconnecting,
    canDisconnect,
    getAccountByProvider,
    connectAccount,
    disconnectAccount,
  } = useAccountConnection();

  // 표시할 Provider 목록 (Apple, Google 순서)
  const providers = [AuthProviderType.APPLE, AuthProviderType.GOOGLE];

  return (
    <TopScreenSafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isConnecting || isDisconnecting}
        >
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>연결 계정 관리</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* 연결 계정 목록 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>연결 계정 목록</Text>

          <View style={styles.accountList}>
            {providers.map((provider) => {
              const account = getAccountByProvider(provider);
              const providerInfo = getAuthProviderInfo(provider);
              const isConnected = !!account;
              const canDisconnectThis = account ? canDisconnect(account.id) : false;

              return (
                <AccountItem
                  key={provider}
                  provider={provider}
                  providerName={providerInfo.displayName}
                  email={account?.email || null}
                  isConnected={isConnected}
                  canDisconnect={canDisconnectThis}
                  isLoading={isConnecting || isDisconnecting}
                  onConnect={() => connectAccount(provider)}
                  onDisconnect={() => account && disconnectAccount(account)}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
    </TopScreenSafeAreaView>
  );
};

/**
 * 개별 계정 아이템 컴포넌트
 */
interface AccountItemProps {
  provider: AuthProviderType;
  providerName: string;
  email: string | null;
  isConnected: boolean;
  canDisconnect: boolean;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const AccountItem: React.FC<AccountItemProps> = ({
  provider,
  providerName,
  email,
  isConnected,
  canDisconnect,
  isLoading,
  onConnect,
  onDisconnect,
}) => {
  const buttonColor = getConnectionButtonColor(
    isConnected ? AccountConnectionStatus.CONNECTED : AccountConnectionStatus.NONE
  );

  return (
    <View style={styles.accountItem}>
      <View style={styles.accountInfo}>
        <Text style={styles.accountProvider}>
          {providerName} 로 연결
        </Text>
        {email && (
          <Text style={styles.accountEmail}>{email}</Text>
        )}
      </View>

      {isConnected ? (
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: buttonColor },
            (!canDisconnect || isLoading) && styles.buttonDisabled,
          ]}
          onPress={onDisconnect}
          disabled={!canDisconnect || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={GREY[600]} />
          ) : (
            <Text
              style={[
                styles.buttonText,
                !canDisconnect && styles.buttonTextDisabled,
              ]}
            >
              연결 해제
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: buttonColor },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={onConnect}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={GREY[600]} />
          ) : (
            <Text style={styles.buttonText}>연결하기</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREY[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: GREY[100],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GREY[900],
    fontFamily: 'Pretendard',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: GREY[600],
    fontFamily: 'Pretendard',
    marginBottom: 16,
  },
  accountList: {
    gap: 20,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountInfo: {
    flex: 1,
  },
  accountProvider: {
    fontSize: 14,
    fontWeight: '500',
    color: GREY[900],
    fontFamily: 'Pretendard',
    marginBottom: 4,
  },
  accountEmail: {
    fontSize: 12,
    fontWeight: '400',
    color: GREY[600],
    fontFamily: 'Pretendard',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    color: GREY[700],
    fontFamily: 'Pretendard',
  },
  buttonTextDisabled: {
    color: GREY[500],
  },
});
