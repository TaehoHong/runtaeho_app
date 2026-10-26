import { isAxiosError } from 'axios';
import { t } from '~/i18n';

const rejectionMessages = {
  RUNNING_FUTURE_END_TIME: '러닝 종료 시간이 현재보다 미래여서 저장할 수 없어요. 기기의 날짜와 시간을 확인해주세요.',
  RUNNING_EXCESSIVE_AVERAGE_SPEED: '평균 속도가 러닝 기록 허용 범위를 초과해 저장할 수 없어요.',
  RUNNING_INVALID_METRICS: '러닝 거리 또는 시간 정보가 올바르지 않아 저장할 수 없어요.',
  RUNNING_INVALID_GPS: '러닝 위치 정보가 올바르지 않아 저장할 수 없어요.',
} as const;

export type RunningRejectionCode = keyof typeof rejectionMessages;

export const isRunningRejectionCode = (code: unknown): code is RunningRejectionCode =>
  typeof code === 'string' && Object.prototype.hasOwnProperty.call(rejectionMessages, code);

export class RunningValidationError extends Error {
  constructor(readonly code: RunningRejectionCode) {
    super(code);
    this.name = 'RunningValidationError';
  }
}

export const getRunningRejectionCode = (error: unknown): RunningRejectionCode | null => {
  if (error instanceof RunningValidationError) return error.code;
  if (!isAxiosError<{ extra?: { code?: unknown } }>(error) || error.response?.status !== 400) return null;
  const code = error.response.data?.extra?.code;
  return isRunningRejectionCode(code) ? code : null;
};

export const getRunningRejectionMessage = (error: unknown): string | null => {
  const code = getRunningRejectionCode(error);
  return code ? t(rejectionMessages[code]) : null;
};
