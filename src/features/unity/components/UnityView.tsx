/**
 * Unity View Component
 *
 * Unity 화면을 표시하는 React Native 컴포넌트
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { UIManager, findNodeHandle, ViewStyle } from 'react-native';
import { requireNativeComponent } from 'react-native';

// TypeScript 인터페이스 정의
export interface UnityViewProps {
  style?: ViewStyle;
  onUnityReady?: (event: { nativeEvent: { message: string; timestamp: string } }) => void;
  onUnityError?: (event: { nativeEvent: { error: string; timestamp: string } }) => void;
  onCharacterStateChanged?: (event: { nativeEvent: { state: string; timestamp: string } }) => void;
}

export interface UnityViewRef {
  sendMessageToUnity: (objectName: string, methodName: string, parameter: string) => void;
  pauseUnity: () => void;
  resumeUnity: () => void;
}

// Native Unity View Component
const NativeUnityView = requireNativeComponent<UnityViewProps>('UnityView');

export const UnityView = forwardRef<UnityViewRef, UnityViewProps>((props, ref) => {
  const viewRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    sendMessageToUnity: (objectName: string, methodName: string, parameter: string) => {
      const viewId = findNodeHandle(viewRef.current);
      if (viewId) {
        UIManager.dispatchViewManagerCommand(
          viewId,
          UIManager.getViewManagerConfig('UnityView').Commands.sendMessageToUnity,
          [objectName, methodName, parameter]
        );
      }
    },
    pauseUnity: () => {
      const viewId = findNodeHandle(viewRef.current);
      if (viewId) {
        UIManager.dispatchViewManagerCommand(
          viewId,
          UIManager.getViewManagerConfig('UnityView').Commands.pauseUnity,
          []
        );
      }
    },
    resumeUnity: () => {
      const viewId = findNodeHandle(viewRef.current);
      if (viewId) {
        UIManager.dispatchViewManagerCommand(
          viewId,
          UIManager.getViewManagerConfig('UnityView').Commands.resumeUnity,
          []
        );
      }
    },
  }));

  return (
    <NativeUnityView
      ref={viewRef}
      style={props.style}
      onUnityReady={props.onUnityReady}
      onUnityError={props.onUnityError}
      onCharacterStateChanged={props.onCharacterStateChanged}
    />
  );
});

export default UnityView;