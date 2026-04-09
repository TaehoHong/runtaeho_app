import { useCallback, useState } from 'react';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { ShareResult, ShareRunningData } from '../models/types';
import { captureAndShare, type ViewBounds } from '../services/shareService';

interface UseShareCaptureActionsOptions {
  runningData: ShareRunningData;
}

interface UseShareCaptureActionsValue {
  isCapturing: boolean;
  shareResult: (
    exportStageRef: RefObject<View | null>,
    exportStageBounds?: ViewBounds
  ) => Promise<ShareResult>;
}

export const useShareCaptureActions = ({
  runningData,
}: UseShareCaptureActionsOptions): UseShareCaptureActionsValue => {
  const [isCapturing, setIsCapturing] = useState(false);

  const runCaptureAction = useCallback(async <T>(action: () => Promise<T>): Promise<T> => {
    setIsCapturing(true);

    try {
      return await action();
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const shareResult = useCallback(async (
    exportStageRef: RefObject<View | null>,
    exportStageBounds?: ViewBounds
  ): Promise<ShareResult> => {
    if (!exportStageRef.current) {
      return {
        success: false,
        message: 'Export stage not ready',
      };
    }

    const distanceKm = (runningData.distance / 1000).toFixed(2);
    const message = `오늘 ${distanceKm}km 달렸어요! #RunTaeho #러닝`;

    return runCaptureAction(() =>
      captureAndShare(
        exportStageRef,
        'RunTaeho 러닝 기록',
        message,
        exportStageBounds
      )
    );
  }, [runCaptureAction, runningData.distance]);

  return {
    isCapturing,
    shareResult,
  };
};
