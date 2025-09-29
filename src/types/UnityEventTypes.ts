/**
 * Unity 이벤트 타입 정의
 * UnityBridgeContext에서 사용하는 이벤트들의 구체적인 타입들
 */

// ==========================================
// Unity 이벤트 기본 구조
// ==========================================

export interface UnityBaseEvent {
  timestamp?: string;
  eventId?: string;
}

// ==========================================
// 캐릭터 상태 변경 이벤트
// ==========================================

export interface UnityCharacterStateEvent extends UnityBaseEvent {
  state: string;
  motion?: string;
  speed?: number;
  isMoving?: boolean;
}

// ==========================================
// 아바타 변경 이벤트
// ==========================================

export interface UnityAvatarChangeEvent extends UnityBaseEvent {
  avatarData: {
    list: Array<{
      name: string;
      part: string;
      itemPath: string;
    }>;
  } | string; // JSON 문자열일 수도 있음
}

// ==========================================
// 아바타 변경 오류 이벤트
// ==========================================

export interface UnityAvatarChangeErrorEvent extends UnityBaseEvent {
  error: string;
  message?: string;
  avatarData?: unknown;
}

// ==========================================
// 애니메이션 완료 이벤트
// ==========================================

export interface UnityAnimationCompleteEvent extends UnityBaseEvent {
  animationName: string;
  duration?: number;
}

// ==========================================
// Unity 상태 이벤트
// ==========================================

export interface UnityStatusEvent extends UnityBaseEvent {
  characterManagerExists: boolean;
  currentSpeed: number;
  status?: string;
  isReady?: boolean;
}

// ==========================================
// Unity 일반 이벤트 (복합)
// ==========================================

export type UnityEvent =
  | UnityCharacterStateEvent
  | UnityAvatarChangeEvent
  | UnityAvatarChangeErrorEvent
  | UnityAnimationCompleteEvent
  | UnityStatusEvent;

// ==========================================
// 이벤트 리스너 타입
// ==========================================

export type UnityEventListener<T extends UnityEvent = UnityEvent> = (event: T) => void;