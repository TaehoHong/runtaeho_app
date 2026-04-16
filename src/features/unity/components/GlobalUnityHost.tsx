import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { UnityView } from './UnityView';
import { areWindowOriginsEqual, toHostLocalFrame, type WindowOrigin } from './globalUnityHostLayout';
import { doesViewportMeasurementMatch } from './viewportMeasurementGuard';
import { useUnitySessionController } from '../hooks/useUnitySessionController';
import { useUnityStore, type UnityViewport } from '~/stores/unity/unityStore';

const MIN_HOST_SIZE = 1;

/**
 * 앱 전체에서 Unity native surface를 하나만 유지하는 전역 host.
 * 실제 노출 위치는 unityStore.activeViewport가 결정한다.
 */
export const GlobalUnityHost: React.FC = () => {
  const activeViewport = useUnityStore((state) => state.activeViewport);
  const setRenderedViewport = useUnityStore((state) => state.setRenderedViewport);
  const { reattachToken, handleUnityReady, handleUnityError } = useUnitySessionController();
  const [hasMountedUnity, setHasMountedUnity] = useState(false);
  const [lastViewport, setLastViewport] = useState<UnityViewport | null>(null);
  const [overlayWindowOrigin, setOverlayWindowOrigin] = useState<WindowOrigin | null>(null);
  const overlayRef = useRef<View>(null);
  const hostRef = useRef<View>(null);
  const renderedViewportMeasureTokenRef = useRef(0);

  useEffect(() => {
    if (!activeViewport) {
      return;
    }

    setHasMountedUnity(true);
    setLastViewport(activeViewport);
  }, [activeViewport]);

  const resolvedViewport = activeViewport ?? lastViewport;
  const resolvedHostFrame = useMemo(() => {
    if (!resolvedViewport || !overlayWindowOrigin) {
      return null;
    }

    return toHostLocalFrame(resolvedViewport.frame, overlayWindowOrigin);
  }, [overlayWindowOrigin, resolvedViewport]);

  const measureOverlayWindowOrigin = useCallback(() => {
    requestAnimationFrame(() => {
      overlayRef.current?.measureInWindow((x, y, width, height) => {
        if (width <= 0 || height <= 0) {
          return;
        }

        const nextOrigin = { x, y };
        setOverlayWindowOrigin((currentOrigin) =>
          areWindowOriginsEqual(currentOrigin, nextOrigin) ? currentOrigin : nextOrigin
        );
      });
    });
  }, []);

  const measureRenderedViewport = useCallback(() => {
    if (!activeViewport || !resolvedViewport || !resolvedHostFrame) {
      return;
    }

    renderedViewportMeasureTokenRef.current += 1;
    const measureToken = renderedViewportMeasureTokenRef.current;

    requestAnimationFrame(() => {
      if (measureToken !== renderedViewportMeasureTokenRef.current) {
        return;
      }

      hostRef.current?.measureInWindow((x, y, width, height) => {
        const currentViewport = useUnityStore.getState().activeViewport;
        if (
          measureToken !== renderedViewportMeasureTokenRef.current
          || width <= MIN_HOST_SIZE
          || height <= MIN_HOST_SIZE
          || !doesViewportMeasurementMatch(currentViewport, resolvedViewport)
        ) {
          return;
        }

        setRenderedViewport({
          owner: currentViewport.owner,
          frame: { x, y, width, height },
        });
      });
    });
  }, [activeViewport, resolvedHostFrame, resolvedViewport, setRenderedViewport]);

  const hostStyle = useMemo(() => {
    if (!resolvedViewport || !resolvedHostFrame) {
      return styles.hiddenHost;
    }

    return {
      left: resolvedHostFrame.x,
      top: resolvedHostFrame.y,
      width: Math.max(resolvedHostFrame.width, MIN_HOST_SIZE),
      height: Math.max(resolvedHostFrame.height, MIN_HOST_SIZE),
      borderRadius: resolvedViewport.borderRadius ?? 0,
      opacity: activeViewport ? 1 : 0,
    };
  }, [activeViewport, resolvedHostFrame, resolvedViewport]);

  const handleHostLayout = useCallback(() => {
    measureRenderedViewport();
  }, [measureRenderedViewport]);

  const handleOverlayLayout = useCallback(() => {
    measureOverlayWindowOrigin();
  }, [measureOverlayWindowOrigin]);

  useEffect(() => {
    measureOverlayWindowOrigin();
  }, [measureOverlayWindowOrigin, resolvedViewport]);

  useEffect(() => {
    measureRenderedViewport();
  }, [measureRenderedViewport]);

  if (!hasMountedUnity) {
    return null;
  }

  return (
    <View
      ref={overlayRef}
      pointerEvents="none"
      collapsable={false}
      onLayout={handleOverlayLayout}
      style={styles.overlay}
    >
      <View
        ref={hostRef}
        pointerEvents="none"
        onLayout={handleHostLayout}
        style={[styles.host, hostStyle]}
      >
        <UnityView
          style={styles.unityView}
          reattachToken={reattachToken}
          onUnityReady={handleUnityReady}
          onUnityError={handleUnityError}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    pointerEvents: 'none',
  },
  host: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  hiddenHost: {
    left: 0,
    top: 0,
    width: MIN_HOST_SIZE,
    height: MIN_HOST_SIZE,
    opacity: 0,
  },
  unityView: {
    flex: 1,
  },
});

export default GlobalUnityHost;
