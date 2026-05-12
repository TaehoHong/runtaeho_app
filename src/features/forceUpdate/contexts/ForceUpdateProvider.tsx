import React, { ReactNode, createContext, useContext, useMemo } from 'react';
import { useForceUpdateCheck } from '../hooks/useForceUpdateCheck';
import { ForceUpdateModal } from '../views/components/ForceUpdateModal';
import { ForceUpdateStatus } from '../models/ForceUpdateState';

interface ForceUpdateContextValue {
  /** 업데이트 필요 여부 */
  isUpdateRequired: boolean;
  /** 체크 중 여부 */
  isChecking: boolean;
  /** 에러 발생 여부 */
  isError: boolean;
  /** 최소 요구 버전 */
  minimumVersion: string | null;
  /** 메시지 */
  message: string | null;
  /** 수동 버전 체크 */
  checkForUpdate: (force?: boolean) => Promise<void>;
}

const ForceUpdateContext = createContext<ForceUpdateContextValue | null>(null);

interface ForceUpdateProviderProps {
  children: ReactNode;
  /** 앱 시작 시 버전 체크 (기본값: true) */
  checkOnLaunch?: boolean;
  /** 포그라운드 복귀 시 버전 체크 (기본값: true) */
  checkOnForeground?: boolean;
}

/**
 * 강제 업데이트 Provider
 * - 앱 시작 시 및 포그라운드 복귀 시 버전 체크
 * - 업데이트 필요 시 모달로 앱 진입 차단
 * - 네트워크 에러 시 재시도 버튼만 표시
 */
export function ForceUpdateProvider({
  children,
  checkOnLaunch = true,
  checkOnForeground = true,
}: ForceUpdateProviderProps) {
  const {
    status,
    checkSource,
    minimumVersion,
    message,
    error,
    isChecking,
    isUpdateRequired,
    isError,
    checkForUpdate,
  } = useForceUpdateCheck({
    checkOnLaunch,
    checkOnForeground,
  });

  const contextValue = useMemo<ForceUpdateContextValue>(
    () => ({
      isUpdateRequired,
      isChecking,
      isError,
      minimumVersion,
      message,
      checkForUpdate,
    }),
    [isUpdateRequired, isChecking, isError, minimumVersion, message, checkForUpdate]
  );

  // 포그라운드 복귀 체크는 조용히 실행하고, 결과가 필요할 때만 모달을 표시한다.
  const showModal =
    (status === ForceUpdateStatus.CHECKING && checkSource !== 'foreground') ||
    status === ForceUpdateStatus.UPDATE_REQUIRED ||
    status === ForceUpdateStatus.ERROR;

  const handleRetry = () => {
    checkForUpdate(true); // force 체크
  };

  return (
    <ForceUpdateContext.Provider value={contextValue}>
      {children}
      <ForceUpdateModal
        visible={showModal}
        status={status}
        minimumVersion={minimumVersion}
        message={message}
        error={error}
        onRetry={handleRetry}
      />
    </ForceUpdateContext.Provider>
  );
}

/**
 * ForceUpdateProvider의 context에 접근하는 훅
 */
export function useForceUpdate(): ForceUpdateContextValue {
  const context = useContext(ForceUpdateContext);

  if (!context) {
    throw new Error('useForceUpdate must be used within a ForceUpdateProvider');
  }

  return context;
}
