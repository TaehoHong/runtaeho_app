/**
 * Unity View Component for React Native
 * React Native에서 Unity 화면을 표시하기 위한 컴포넌트
 */

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  ViewStyle,
  findNodeHandle,
  UIManager,
  Platform,
  NativeModules,
} from 'react-native';
import { requireNativeComponent } from 'react-native';

// ==========================================
// Types
// ==========================================

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

// ==========================================
// Native Component
// ==========================================

const NativeUnityView = requireNativeComponent<UnityViewProps>('UnityViewManager');

// ==========================================
// Unity View Commands
// ==========================================

const UnityViewCommands = UIManager.getViewManagerConfig('UnityViewManager')?.Commands || {};

const sendUnityCommand = (viewRef: any, command: string, args: any[] = []) => {
  if (Platform.OS === 'ios') {
    const nodeHandle = findNodeHandle(viewRef);
    if (nodeHandle) {
      UIManager.dispatchViewManagerCommand(nodeHandle, command, args);
    }
  }
};

// ==========================================
// Unity View Component
// ==========================================

export const UnityView = forwardRef<UnityViewRef, UnityViewProps>(
  ({ style, onUnityReady, onUnityError, onCharacterStateChanged }, ref) => {
    const viewRef = useRef<any>(null);

    // Imperative API for parent components
    useImperativeHandle(ref, () => ({
      sendMessageToUnity: (objectName: string, methodName: string, parameter: string) => {
        sendUnityCommand(viewRef.current, 'sendMessageToUnity', [objectName, methodName, parameter]);
      },

      pauseUnity: () => {
        sendUnityCommand(viewRef.current, 'pauseUnity');
      },

      resumeUnity: () => {
        sendUnityCommand(viewRef.current, 'resumeUnity');
      },
    }));

    // Event handlers
    const handleUnityReady = (event: any) => {
      console.log('[UnityView] Unity ready:', event.nativeEvent);
      onUnityReady?.(event);
    };

    const handleUnityError = (event: any) => {
      console.error('[UnityView] Unity error:', event.nativeEvent);
      onUnityError?.(event);
    };

    const handleCharacterStateChanged = (event: any) => {
      console.log('[UnityView] Character state changed:', event.nativeEvent);
      onCharacterStateChanged?.(event);
    };

    return (
      <NativeUnityView
        ref={viewRef}
        style={style}
        onUnityReady={handleUnityReady}
        onUnityError={handleUnityError}
        onCharacterStateChanged={handleCharacterStateChanged}
      />
    );
  }
);

UnityView.displayName = 'UnityView';

// ==========================================
// Export
// ==========================================

export default UnityView;