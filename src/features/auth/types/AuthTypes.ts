export type AuthProvider = 'GOOGLE' | 'APPLE';

export interface UserAuthData {
  id: string;
  email: string;
  nickname: string;
  accessToken: string;
  refreshToken: string;
  profileImageURL?: string;
}

export interface TokenDto {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export interface AuthError extends Error {
  code?: string;
}

export enum AuthenticationError {
  NO_PRESENTING_VIEW_CONTROLLER = 'NO_PRESENTING_VIEW_CONTROLLER',
  NO_USER_PROFILE = 'NO_USER_PROFILE',
  NO_AUTH_CODE = 'NO_AUTH_CODE',
  SIGN_IN_FAILED = 'SIGN_IN_FAILED',
  USER_CANCELLED = 'USER_CANCELLED',
}