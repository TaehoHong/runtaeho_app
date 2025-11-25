import React, { useRef, useEffect, useCallback } from 'react';
import { requireNativeComponent, type ViewProps } from 'react-native';
import { unityService } from '../services/UnityService';

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
    console.log('[UnityView] Mounted - Resetting GameObject Ready state');
    unityService.resetGameObjectReady();

    return () => {
      console.log('[UnityView] Unmounted');
    };
  }, []);

  // 디버깅용 이벤트 핸들러
  const handleUnityReady = useCallback((event: any) => {
    console.log('[UnityView] onUnityReady event received:', event.nativeEvent);
    props.onUnityReady?.(event);
  }, [props]);

  const handleUnityError = useCallback((event: any) => {
    console.error('[UnityView] onUnityError event received:', event.nativeEvent);
    props.onUnityError?.(event);
  }, [props]);

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
