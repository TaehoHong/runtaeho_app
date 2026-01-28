import React, { useRef, useEffect, useCallback } from 'react';
import { requireNativeComponent, type ViewProps } from 'react-native';
import { unityService } from '../services/UnityService';
import { UnityBridge } from '../bridge/UnityBridge';

interface UnityViewProps extends ViewProps {
  // Unity Ready 이벤트
  onUnityReady?: (event: any) => void;
  // Unity Error 이벤트
  onUnityError?: (event: any) => void;
  // 캐릭터 상태 변경 이벤트
  onCharacterStateChanged?: (event: any) => void;
}

// Native Unity View 컴포넌트 - iOS에서 'UnityView'로 등록됨
const NativeUnityView = requireNativeComponent<UnityViewProps>('UnityView');

export const UnityView: React.FC<UnityViewProps> = (props) => {
  const viewRef = useRef(null);

  // ⚠️ 중요: UnityView 마운트 시 GameObject Ready 상태 리셋
  // 이전 UnityView의 상태를 초기화하여 새로운 UnityView의 GameObject Ready를 정확히 감지
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      console.log('[UnityView] Mounted - Resetting GameObject Ready state');
      await unityService.resetGameObjectReady();

      // ✅ Native 정리와 React 마운트 사이클 동기화
      if (isMounted) {
        await UnityBridge.syncReadyState();
      }
    };

    initialize();

    return () => {
      isMounted = false;
      console.log('[UnityView] Unmounting - Native cleanup initiated');
    };
  }, []);

  // 디버깅용 이벤트 핸들러
  // ★ 의존성을 props 전체가 아닌 특정 콜백으로 변경 (불필요한 재생성 방지)
  const handleUnityReady = useCallback((event: any) => {
    console.log('[UnityView] onUnityReady event received:', event.nativeEvent);
    props.onUnityReady?.(event);
  }, [props.onUnityReady]);

  const handleUnityError = useCallback((event: any) => {
    console.error('[UnityView] onUnityError event received:', event.nativeEvent);
    props.onUnityError?.(event);
  }, [props.onUnityError]);

  return (
    <NativeUnityView
      ref={viewRef}
      {...props}
      onUnityReady={handleUnityReady}
      onUnityError={handleUnityError}
    />
  );
};

export default UnityView;
