/**
 * 인증 제공자 타입
 * Swift AuthProvider.swift에서 마이그레이션
 */
export enum AuthProviderType {
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE',
}

export const AuthProviderConfig = {
  [AuthProviderType.GOOGLE]: {
    displayName: 'Google',
    iconName: 'google_icon',
  },
  [AuthProviderType.APPLE]: {
    displayName: 'Apple',
    iconName: 'apple.logo',
  },
} as const;

export type AuthProviderInfo = {
  displayName: string;
  iconName: string;
};

export const getAuthProviderInfo = (provider: AuthProviderType): AuthProviderInfo => {
  return AuthProviderConfig[provider];
};