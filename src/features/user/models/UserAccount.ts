import { AuthProviderType } from '../../auth/models/AuthType';

/**
 * 연결 계정 모델
 * Swift UserAccount.swift에서 마이그레이션
 */
export interface UserAccount {
  id: number;
  provider: AuthProviderType;
  isConnected: boolean;
  connectedAt: Date | null;
  email: string | null;
}

/**
 * 연결 계정 상태
 * Swift AccountConnectionStatus enum에서 마이그레이션
 */
export enum AccountConnectionStatus {
  CONNECTED = 'connected',
  NONE = 'none',
}

export const AccountConnectionConfig = {
  [AccountConnectionStatus.CONNECTED]: {
    buttonColor: '#7ae87a',
  },
  [AccountConnectionStatus.NONE]: {
    buttonColor: '#d9d9d9',
  },
} as const;

/**
 * UserAccount 생성을 위한 팩토리 함수
 * Swift UserAccount init과 동일
 */
export const createUserAccount = (data: {
  id?: number;
  provider: AuthProviderType;
  isConnected?: boolean;
  connectedAt?: Date | null;
  email?: string | null;
}): UserAccount => ({
  id: data.id ?? 0,
  provider: data.provider,
  isConnected: data.isConnected ?? false,
  connectedAt: data.connectedAt ?? null,
  email: data.email ?? null,
});

/**
 * 계정 연결 해제
 * Swift disconnect() 메서드와 동일
 */
export const disconnectUserAccount = (account: UserAccount): UserAccount => ({
  ...account,
  isConnected: false,
});

/**
 * 연결 상태에 따른 버튼 색상 반환
 */
export const getConnectionButtonColor = (status: AccountConnectionStatus): string => {
  return AccountConnectionConfig[status].buttonColor;
};