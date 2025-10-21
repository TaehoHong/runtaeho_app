import React, { useRef, useEffect } from 'react';
import { requireNativeComponent, type ViewProps, UIManager, findNodeHandle, Platform } from 'react-native';

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

  useEffect(() => {
    // 컴포넌트가 마운트되면 Unity View를 재연결
    if (Platform.OS === 'ios') {
      const nodeHandle = findNodeHandle(viewRef.current);
      if (nodeHandle && UIManager.dispatchViewManagerCommand) {
        // 약간의 지연을 두고 재연결 (레이아웃이 완료된 후)
        setTimeout(() => {
          UIManager.dispatchViewManagerCommand(
            nodeHandle,
            // @ts-ignore
            UIManager.getViewManagerConfig('UnityView').Commands.reattachUnityView,
            []
          );
          console.log('[UnityView] Reattach command dispatched');
        }, 100);
      }
    }
  }, []);

  return <NativeUnityView ref={viewRef} {...props} />;
};

export default UnityView;
