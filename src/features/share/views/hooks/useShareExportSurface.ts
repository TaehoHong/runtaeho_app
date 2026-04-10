import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { ViewBounds } from '../../services/shareService';
import type { UnityViewport, UnityViewportFrame } from '~/stores/unity/unityStore';
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
  syncPreviewViewportForScroll: (scrollY: number) => void;
  handleExportStageLayout: () => void;
  prepareExportSurface: () => Promise<ViewBounds>;
  restorePreviewSurface: () => Promise<void>;
}

const doViewportFramesEqual = (
  left: UnityViewportFrame,
  right: UnityViewportFrame
): boolean =>
  Math.abs(left.x - right.x) <= VIEWPORT_MATCH_EPSILON
  && Math.abs(left.y - right.y) <= VIEWPORT_MATCH_EPSILON
  && Math.abs(left.width - right.width) <= VIEWPORT_MATCH_EPSILON
  && Math.abs(left.height - right.height) <= VIEWPORT_MATCH_EPSILON;

const doViewportsEqual = (
  left: UnityViewport | null,
  right: UnityViewport
): boolean =>
  !!left
  && left.owner === right.owner
  && (left.borderRadius ?? 0) === (right.borderRadius ?? 0)
  && doViewportFramesEqual(left.frame, right.frame);

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
  const currentPreviewScrollYRef = useRef(0);
  const previewMeasuredScrollYRef = useRef(0);
  const previewMeasuredFrameRef = useRef<ViewBounds | null>(null);
  const lastPublishedViewportRef = useRef<UnityViewport | null>(null);
  const pendingPreviewScrollFrameRef = useRef<number | null>(null);
  const [isExportSurfaceVisible, setIsExportSurfaceVisible] = useState(false);

  const publishViewport = useCallback((frame: ViewBounds, borderRadius: number) => {
    const viewport: UnityViewport = {
      owner: 'share',
      frame,
      borderRadius,
    };

    if (doViewportsEqual(lastPublishedViewportRef.current, viewport)) {
      return;
    }

    lastPublishedViewportRef.current = viewport;
    setActiveViewport(viewport);
  }, [setActiveViewport]);

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
      publishViewport(frame, borderRadius);
    });
  }, [measureView, publishViewport]);

  const syncPreviewViewport = useCallback(() => {
    if (isExportSurfaceActiveRef.current) {
      return;
    }

    syncViewport(previewRef, PREVIEW_CORNER_RADIUS, (frame) => {
      previewMeasuredFrameRef.current = frame;
      previewMeasuredScrollYRef.current = currentPreviewScrollYRef.current;
    });
  }, [previewRef, syncViewport]);

  const syncPreviewViewportForScroll = useCallback((scrollY: number) => {
    currentPreviewScrollYRef.current = scrollY;

    if (isExportSurfaceActiveRef.current || !previewMeasuredFrameRef.current) {
      return;
    }

    if (pendingPreviewScrollFrameRef.current !== null) {
      return;
    }

    pendingPreviewScrollFrameRef.current = requestAnimationFrame(() => {
      pendingPreviewScrollFrameRef.current = null;

      const measuredFrame = previewMeasuredFrameRef.current;
      if (!measuredFrame || isExportSurfaceActiveRef.current) {
        return;
      }

      const deltaY = currentPreviewScrollYRef.current - previewMeasuredScrollYRef.current;
      publishViewport(
        {
          ...measuredFrame,
          y: measuredFrame.y - deltaY,
        },
        PREVIEW_CORNER_RADIUS
      );
    });
  }, [publishViewport]);

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
    if (pendingPreviewScrollFrameRef.current !== null) {
      cancelAnimationFrame(pendingPreviewScrollFrameRef.current);
      pendingPreviewScrollFrameRef.current = null;
    }

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
        if (pendingPreviewScrollFrameRef.current !== null) {
          cancelAnimationFrame(pendingPreviewScrollFrameRef.current);
          pendingPreviewScrollFrameRef.current = null;
        }
        clearActiveViewport('share');
        lastPublishedViewportRef.current = null;
      };
    }, [clearActiveViewport, syncPreviewViewport])
  );

  useEffect(() => {
    syncPreviewViewport();
  }, [isLoading, syncPreviewViewport]);

  useEffect(() => () => {
    if (pendingPreviewScrollFrameRef.current !== null) {
      cancelAnimationFrame(pendingPreviewScrollFrameRef.current);
    }
  }, []);

  return {
    exportStageRef,
    isExportSurfaceVisible,
    syncPreviewViewport,
    syncPreviewViewportForScroll,
    handleExportStageLayout,
    prepareExportSurface,
    restorePreviewSurface,
  };
};
