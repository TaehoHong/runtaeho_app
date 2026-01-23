import { type AuthCodeResult } from '../models/AuthResult';

export interface AuthProviderStrategy {
  /**
   * 인증 제공자 설정 초기화
   */
  configure(): void;

  /**
   * 인증 코드 및 사용자 정보 획득
   */
  getAuthorizationCode(): Promise<AuthCodeResult>;

  /**
   * 사용 가능 여부 확인
   */
  isAvailable(): boolean;

  /**
   * 로그아웃 (인증 제공자 세션 정리)
   */
  logout(): Promise<void>;
}