import { UserAuthData } from './UserAuthData';

export interface AuthResult {
  success: boolean;
  userData?: UserAuthData;
  error?: string;
}

export interface AuthCodeResult {
  authorizationCode: string;
  userInfo?: {
    name?: string;
    email?: string;
    photo?: string;
  };
}