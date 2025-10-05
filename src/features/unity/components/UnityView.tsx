import React from 'react';
import { requireNativeComponent, type ViewProps } from 'react-native';

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
  return <NativeUnityView {...props} />;
};

export default UnityView;
