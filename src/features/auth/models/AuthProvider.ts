/**
 * 인증 제공자 타입
 * Swift AuthProvider.swift에서 마이그레이션
 */
export enum AuthProvider {
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE',
}

export const AuthProviderConfig = {
  [AuthProvider.GOOGLE]: {
    displayName: 'Google',
    iconName: 'google_icon',
  },
  [AuthProvider.APPLE]: {
    displayName: 'Apple',
    iconName: 'apple.logo',
  },
} as const;

export type AuthProviderInfo = {
  displayName: string;
  iconName: string;
};

export const getAuthProviderInfo = (provider: AuthProvider): AuthProviderInfo => {
  return AuthProviderConfig[provider];
};