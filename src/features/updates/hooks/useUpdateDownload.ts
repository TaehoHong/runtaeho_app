import { useCallback } from 'react';
import { useUpdateStore } from '../stores/updateStore';
import { UpdateStatus } from '../models/UpdateState';
import {
  downloadUpdate as downloadUpdateService,
  applyUpdate as applyUpdateService,
  isUpdatesEnabled,
} from '../services/updateService';

interface UseUpdateDownloadResult {
  /** 다운로드 진행률 (0-100) */
  progress: number;
  /** 다운로드 중 여부 */
  isDownloading: boolean;
  /** 업데이트 적용 준비 완료 여부 */
  isReady: boolean;
  /** 오류 발생 여부 */
  hasError: boolean;
  /** 오류 메시지 */
  error: Error | null;
  /** 업데이트 다운로드 */
  downloadUpdate: () => Promise<boolean>;
  /** 업데이트 적용 (앱 재시작) */
  applyUpdate: () => Promise<void>;
  /** 상태 초기화 */
  reset: () => void;
}

export function useUpdateDownload(): UseUpdateDownloadResult {
  const {
    status,
    progress,
    error,
    isUpdateReady,
    setStatus,
    setProgress,
    setError,
    setUpdateReady,
    reset,
  } = useUpdateStore();

  const downloadUpdate = useCallback(async (): Promise<boolean> => {
    if (!isUpdatesEnabled()) {
      console.log('[Updates] Download skipped - updates not enabled');
      return false;
    }

    if (status === UpdateStatus.DOWNLOADING) {
      console.log('[Updates] Already downloading');
      return false;
    }

    try {
      setStatus(UpdateStatus.DOWNLOADING);
      setProgress(0);
      setError(null);

      await downloadUpdateService((progressInfo) => {
        setProgress(progressInfo.percentage);
      });

      setProgress(100);
      setUpdateReady(true);
      console.log('[Updates] Download complete, ready to apply');
      return true;
    } catch (err) {
      console.error('[Updates] Download failed:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, [status, setStatus, setProgress, setError, setUpdateReady]);

  const applyUpdate = useCallback(async (): Promise<void> => {
    if (!isUpdatesEnabled()) {
      console.log('[Updates] Apply skipped - updates not enabled');
      return;
    }

    if (!isUpdateReady) {
      console.log('[Updates] No update ready to apply');
      return;
    }

    try {
      console.log('[Updates] Applying update...');
      await applyUpdateService();
      // reloadAsync가 성공하면 앱이 재시작되므로 여기까지 오지 않음
    } catch (err) {
      console.error('[Updates] Apply failed:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [isUpdateReady, setError]);

  return {
    progress,
    isDownloading: status === UpdateStatus.DOWNLOADING,
    isReady: isUpdateReady,
    hasError: status === UpdateStatus.ERROR,
    error,
    downloadUpdate,
    applyUpdate,
    reset,
  };
}
