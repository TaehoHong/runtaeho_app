import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { ViewBounds } from '../../services/shareService';
import { useUnityStore } from '~/stores/unity/unityStore';

const PREVIEW_CORNER_RADIUS = 16;
const EXPORT_CORNER_RADIUS = 0;
const VIEWPORT_MATCH_EPSILON = 2;
const UNITY_EXPORT_VIEWPORT_TIMEOUT_MS = 1200;

const waitForAnimationFrames = async (frameCount: number = 1): Promise<void> => {
  for (let frame = 0; frame < frameCount; frame += 1) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
};

const doViewportFramesMatch = (expected: ViewBounds, actual: ViewBounds): boolean =>
  Math.abs(expected.x - actual.x) <= VIEWPORT_MATCH_EPSILON
  && Math.abs(expected.y - actual.y) <= VIEWPORT_MATCH_EPSILON
  && Math.abs(expected.width - actual.width) <= VIEWPORT_MATCH_EPSILON
  && Math.abs(expected.height - actual.height) <= VIEWPORT_MATCH_EPSILON;

interface UseShareExportSurfaceOptions {
  previewRef: RefObject<View | null>;
  isLoading: boolean;
}

interface UseShareExportSurfaceValue {
  exportStageRef: RefObject<View | null>;
  isExportSurfaceVisible: boolean;
  syncPreviewViewport: () => void;
  handleExportStageLayout: () => void;
  prepareExportSurface: () => Promise<ViewBounds>;
  restorePreviewSurface: () => Promise<void>;
}

export const useShareExportSurface = ({
  previewRef,
  isLoading,
}: UseShareExportSurfaceOptions): UseShareExportSurfaceValue => {
  const setActiveViewport = useUnityStore((state) => state.setActiveViewport);
  const clearActiveViewport = useUnityStore((state) => state.clearActiveViewport);

  const exportStageRef = useRef<View>(null);
  const exportStageBoundsRef = useRef<ViewBounds | null>(null);
  const exportStageLayoutResolverRef = useRef<(() => void) | null>(null);
  const isExportSurfaceActiveRef = useRef(false);
  const [isExportSurfaceVisible, setIsExportSurfaceVisible] = useState(false);

  const measureView = useCallback((
    targetRef: RefObject<View | null>,
    onMeasured?: (frame: ViewBounds) => void
  ) => {
    requestAnimationFrame(() => {
      const target = targetRef.current;
      if (!target || typeof target.measureInWindow !== 'function') {
        return;
      }

      target.measureInWindow((x, y, width, height) => {
        if (width <= 0 || height <= 0) {
          return;
        }

        onMeasured?.({ x, y, width, height });
      });
    });
  }, []);

  const syncViewport = useCallback((
    targetRef: RefObject<View | null>,
    borderRadius: number,
    onMeasured?: (frame: ViewBounds) => void
  ) => {
    measureView(targetRef, (frame) => {
      onMeasured?.(frame);
      setActiveViewport({
        owner: 'share',
        frame,
        borderRadius,
      });
    });
  }, [measureView, setActiveViewport]);

  const syncPreviewViewport = useCallback(() => {
    if (isExportSurfaceActiveRef.current) {
      return;
    }

    syncViewport(previewRef, PREVIEW_CORNER_RADIUS);
  }, [previewRef, syncViewport]);

  const syncExportStageViewport = useCallback(() => {
    syncViewport(exportStageRef, EXPORT_CORNER_RADIUS, (frame) => {
      exportStageBoundsRef.current = frame;
    });
  }, [syncViewport]);

  const handleExportStageLayout = useCallback(() => {
    syncExportStageViewport();
    exportStageLayoutResolverRef.current?.();
    exportStageLayoutResolverRef.current = null;
  }, [syncExportStageViewport]);

  const waitForExportViewportRender = useCallback(async () => {
    const expectedBounds = exportStageBoundsRef.current;
    if (!expectedBounds) {
      throw new Error('Export stage bounds are not ready');
    }

    const startedAt = Date.now();

    while (Date.now() - startedAt < UNITY_EXPORT_VIEWPORT_TIMEOUT_MS) {
      const renderedViewport = useUnityStore.getState().renderedViewport;
      if (
        renderedViewport?.owner === 'share'
        && doViewportFramesMatch(expectedBounds, renderedViewport.frame)
      ) {
        exportStageBoundsRef.current = renderedViewport.frame;
        return renderedViewport.frame;
      }

      await waitForAnimationFrames(1);
    }

    console.warn('[useShareExportSurface] Unity export viewport did not settle before capture', {
      expectedBounds,
      renderedViewport: useUnityStore.getState().renderedViewport,
    });
    throw new Error('Unity export viewport did not settle before capture');
  }, []);

  const prepareExportSurface = useCallback(async (): Promise<ViewBounds> => {
    isExportSurfaceActiveRef.current = true;
    exportStageBoundsRef.current = null;

    const layoutReady = new Promise<void>((resolve) => {
      exportStageLayoutResolverRef.current = resolve;
    });

    setIsExportSurfaceVisible(true);
    await layoutReady;
    await waitForAnimationFrames(2);
    syncExportStageViewport();
    return await waitForExportViewportRender();
  }, [syncExportStageViewport, waitForExportViewportRender]);

  const restorePreviewSurface = useCallback(async () => {
    exportStageLayoutResolverRef.current = null;
    setIsExportSurfaceVisible(false);
    isExportSurfaceActiveRef.current = false;
    await waitForAnimationFrames(2);
    syncPreviewViewport();
  }, [syncPreviewViewport]);

  useFocusEffect(
    useCallback(() => {
      syncPreviewViewport();

      return () => {
        clearActiveViewport('share');
      };
    }, [clearActiveViewport, syncPreviewViewport])
  );

  useEffect(() => {
    syncPreviewViewport();
  }, [isLoading, syncPreviewViewport]);

  return {
    exportStageRef,
    isExportSurfaceVisible,
    syncPreviewViewport,
    handleExportStageLayout,
    prepareExportSurface,
    restorePreviewSurface,
  };
};
