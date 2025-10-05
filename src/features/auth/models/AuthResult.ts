import { type UserAuthData } from './UserAuthData';

export interface AuthResult {
  success: boolean;
  userData?: UserAuthData;
  error?: string;
}

export interface AuthCodeResult {
  authorizationCode: string;
  userInfo: {
    name: string | null;
    email: string | null;
  };
}