import { t } from '~/i18n';
/**
 * 인증 관련 메시지 상수
 */
export const AuthMessages = {
  get LOGIN_FAILED() { return t("로그인 실패"); },
  get LOGIN_ERROR() { return t("로그인 중 오류가 발생했습니다."); },
  get UNKNOWN_ERROR() { return t("알 수 없는 오류가 발생했습니다."); },
} as const;