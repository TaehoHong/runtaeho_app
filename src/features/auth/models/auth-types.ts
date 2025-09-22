export interface UserAuthData {
  accessToken: string;
  refreshToken: string;
  nickname: string;
  email?: string;
  profileImage?: string;
  provider: 'GOOGLE' | 'APPLE';
  userId: string;
}

export interface TokenDto {
  userId: number;
  accessToken: string;
  refreshToken: string;
}

export enum AuthProvider {
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE'
}

export interface AuthProviderInfo {
  displayName: string;
  iconName: string;
}

export const AUTH_PROVIDER_INFO: Record<AuthProvider, AuthProviderInfo> = {
  [AuthProvider.GOOGLE]: {
    displayName: 'Google',
    iconName: 'google_icon'
  },
  [AuthProvider.APPLE]: {
    displayName: 'Apple',
    iconName: 'apple.logo'
  }
};

export class AuthenticationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'AuthenticationError';
  }

  static networkError(error: Error): AuthenticationError {
    return new AuthenticationError('Network error occurred', error);
  }
}