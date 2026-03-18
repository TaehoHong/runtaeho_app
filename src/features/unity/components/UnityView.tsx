import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  findNodeHandle,
  requireNativeComponent,
  StyleSheet,
  UIManager,
  type ViewProps,
} from 'react-native';
import { unityService } from '../services/UnityService';
import { UnityBridge } from '../bridge/UnityBridge';

interface UnityViewProps extends ViewProps {
  // Unity Ready 이벤트
  onUnityReady?: (event: any) => void;
  // Unity Error 이벤트
  onUnityError?: (event: any) => void;
  // 캐릭터 상태 변경 이벤트
  onCharacterStateChanged?: (event: any) => void;
  // Native reattach recovery trigger
  reattachToken?: number;
}

// Native Unity View 컴포넌트 - iOS에서 'UnityView'로 등록됨
const NativeUnityView = requireNativeComponent<UnityViewProps>('UnityView');
const SURFACE_VISIBILITY_FAILSAFE_MS = 400;

export const UnityView: React.FC<UnityViewProps> = (props) => {
  const { onUnityReady, onUnityError, reattachToken, style, ...restProps } = props;
  const viewRef = useRef(null);
  const [surfaceVisible, setSurfaceVisible] = useState(false);
  const readyEventReceivedRef = useRef(false);
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReattachTokenRef = useRef(reattachToken ?? 0);

  const clearVisibilityTimer = useCallback(() => {
    if (visibilityTimerRef.current) {
      clearTimeout(visibilityTimerRef.current);
      visibilityTimerRef.current = null;
    }
  }, []);

  // 화면 재진입 시에는 기존 Unity를 우선 재사용하고,
  // 실제로 ready가 아닌 경우에만 기존 reset 경로를 수행한다.
  useEffect(() => {
    let isMounted = true;
    let shouldScheduleFailsafe = true;
    readyEventReceivedRef.current = false;
    setSurfaceVisible(false);

    const initialize = async () => {
      try {
        const syncedReady = await UnityBridge.syncReadyState();
        if (!isMounted) {
          return;
        }

        if (syncedReady) {
          readyEventReceivedRef.current = true;
          setSurfaceVisible(true);
          shouldScheduleFailsafe = false;
          return;
        }

        if (!syncedReady) {
          console.log('[UnityView] GameObject not ready, running reset fallback');
          await unityService.resetGameObjectReady();
          if (isMounted) {
            const recoveredReady = await UnityBridge.syncReadyState();
            if (recoveredReady) {
              readyEventReceivedRef.current = true;
              setSurfaceVisible(true);
              shouldScheduleFailsafe = false;
            }
          }
        }
      } catch (error) {
        console.error('[UnityView] Initialization sync failed:', error);
      } finally {
        if (!isMounted || !shouldScheduleFailsafe) {
          return;
        }

        clearVisibilityTimer();
        visibilityTimerRef.current = setTimeout(async () => {
          if (!isMounted || readyEventReceivedRef.current) {
            return;
          }

          try {
            const ready = await UnityBridge.syncReadyState();
            if (!isMounted || readyEventReceivedRef.current) {
              return;
            }
            if (ready) {
              console.log('[UnityView] Surface visibility recovered by failsafe sync');
              setSurfaceVisible(true);
            }
          } catch (error) {
            console.error('[UnityView] Surface failsafe sync failed:', error);
          }
        }, SURFACE_VISIBILITY_FAILSAFE_MS);
      }
    };

    void initialize();

    return () => {
      isMounted = false;
      clearVisibilityTimer();
      console.log('[UnityView] Unmounting - Native cleanup initiated');
    };
  }, [clearVisibilityTimer]);

  useEffect(() => {
    const currentToken = reattachToken ?? 0;
    if (currentToken === lastReattachTokenRef.current) {
      return;
    }

    lastReattachTokenRef.current = currentToken;

    const reactTag = findNodeHandle(viewRef.current);
    const command = UIManager.getViewManagerConfig('UnityView')?.Commands?.reattachUnityView;
    if (!reactTag || command == null) {
      console.warn('[UnityView] reattach command unavailable');
      return;
    }

    readyEventReceivedRef.current = false;
    setSurfaceVisible(false);
    UIManager.dispatchViewManagerCommand(reactTag, command, []);
  }, [reattachToken]);

  // 디버깅용 이벤트 핸들러
  // ★ 의존성을 props 전체가 아닌 특정 콜백으로 변경 (불필요한 재생성 방지)
  const handleUnityReady = useCallback((event: any) => {
    console.log('[UnityView] onUnityReady event received:', event.nativeEvent);
    readyEventReceivedRef.current = true;
    clearVisibilityTimer();
    setSurfaceVisible(true);
    onUnityReady?.(event);
  }, [clearVisibilityTimer, onUnityReady]);

  const handleUnityError = useCallback((event: any) => {
    console.error('[UnityView] onUnityError event received:', event.nativeEvent);
    onUnityError?.(event);
  }, [onUnityError]);

  return (
    <NativeUnityView
      ref={viewRef}
      {...restProps}
      style={[style, !surfaceVisible && styles.hiddenSurface]}
      onUnityReady={handleUnityReady}
      onUnityError={handleUnityError}
    />
  );
};

const styles = StyleSheet.create({
  hiddenSurface: {
    opacity: 0,
  },
});

export default UnityView;
