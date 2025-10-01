/**
 * Unity 모듈 통합 Export
 *
 * Unity 연동을 위한 중앙집중식 export
 * Swift Unity 관련 파일들을 React Native로 마이그레이션
 */

// Core Unity Service (기존 인터페이스 유지)
export { UnityService, unityService } from './services/UnityService';
export type { UnityServiceInterface } from './services/UnityService';

// Unity Bridge Integration (Zustand + Service Pattern)
// Note: UnityBridgeContext는 사용하지 않고 Zustand + UnityBridgeService 패턴 사용
export { createUnityBridgeService, disposeUnityBridgeService, getUnityBridgeService } from '~/features/unity/bridge/UnityBridgeService';

// Unity Store (Zustand)
export { useUnityStore } from '~/stores/unity/unityStore';

// Unity ViewModel (비즈니스 로직)
export { useUnityViewModel } from '~/features/unity/viewmodels/UnityViewModel';

// Unity Types and DTOs
export type {
  UnityAnimationType, UnityAvatarDto, UnityAvatarUpdateOptions, UnityBackgroundDto, UnityBridgeMessage, UnityConfiguration, UnityEvent,
  UnityEventType, UnityItemData, UnityRunningDto, UnityStatus, UnityVector3
} from './types/UnityTypes';

// Unity Components (주석 처리 - 컴포넌트 구현 필요)
// export { UnityView } from './components/UnityView';
// export type { UnityViewProps, UnityViewRef } from './components/UnityView';

// Unity Bridge (현재는 주석 처리)
export { UnityBridge } from './bridge/UnityBridge';
export type { UnityBridgeInterface } from './bridge/UnityBridge';
