/**
 * Unity 모듈 통합 Export
 *
 * Unity 연동을 위한 중앙집중식 export
 * Swift Unity 관련 파일들을 React Native로 마이그레이션
 */


// Unity Bridge Integration (Zustand + Service Pattern)
// Note: UnityBridgeContext는 사용하지 않고 Zustand + UnityBridgeService 패턴 사용
export { unityService } from '~/features/unity/services/UnityService';

// Unity Store (Zustand)
export { useUnityStore } from '~/stores/unity/unityStore';

// Unity ViewModel (비즈니스 로직)
export { useUnityViewModel } from '~/features/unity/viewmodels/UnityViewModel';

// Unity Types and DTOs
export type {
  UnityAnimationType, UnityAvatarUpdateOptions, UnityBridgeMessage, UnityConfiguration, UnityEvent,
  UnityEventType, UnityStatus
} from './types/UnityTypes';

// Unity Bridge (현재는 주석 처리)
export type { UnityBridgeInterface } from './bridge/UnityBridge';
