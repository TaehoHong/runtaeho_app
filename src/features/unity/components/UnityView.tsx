import React from 'react';
import { requireNativeComponent, type ViewProps } from 'react-native';

interface UnityViewProps extends ViewProps {
  // Unity View에 전달할 props가 있으면 여기 정의
}

// Native Unity View 컴포넌트
const NativeUnityView = requireNativeComponent<UnityViewProps>('UnityViewManager');

export const UnityView: React.FC<UnityViewProps> = (props) => {
  return <NativeUnityView {...props} />;
};

export default UnityView;
