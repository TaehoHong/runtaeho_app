/**
 * Unity Types and DTOs
 *
 * Unity Bridge 관련 TypeScript 타입 정의
 * React Native와 Unity 간의 통신을 위한 인터페이스들
 * Swift Unity 관련 타입들을 TypeScript로 마이그레이션
 * UnityAvatarDto, UnityViewController 등 Swift 코드 참조
 */

import type { Item } from "~/features/avatar";

/* 
 * Unity Animation Type
 * Unity에서 사용할 애니메이션 타입
 */
export type UnityAnimationType =
  | 'IDLE'           // 대기
  | 'WALK'           // 걷기
  | 'RUN'            // 뛰기
  | 'SPRINT'         // 전력질주
  | 'JUMP'           // 점프
  | 'CELEBRATE'      // 축하
  | 'STRETCH'        // 스트레칭
  | 'DRINK'          // 물마시기
  | 'WIPE_SWEAT'     // 땀닦기
  | 'TIRED'          // 피곤함
  | 'VICTORY'        // 승리
  | 'CUSTOM';        // 커스텀

/**
 * Unity Event Type (확장)
 * Unity 이벤트 타입 정의
 */
export type UnityEventType =
  | 'CHARACTER_LOADED'       // 캐릭터 로드 완료
  | 'ANIMATION_STARTED'      // 애니메이션 시작
  | 'ANIMATION_FINISHED'     // 애니메이션 완료
  | 'SCENE_CHANGED'         // 씬 변경
  | 'ERROR'                 // 오류 발생
  | 'USER_INTERACTION'      // 사용자 상호작용
  | 'RUNNING_MILESTONE'     // 러닝 마일스톤
  | 'ACHIEVEMENT_UNLOCKED'  // 업적 달성
  | 'CHARACTER_STATE_CHANGED' // 캐릭터 상태 변경
  | 'AVATAR_CHANGED'        // 아바타 변경
  | 'ANIMATION_COMPLETE'    // 애니메이션 완료
  | 'UNITY_ERROR'           // Unity 오류
  | 'UNITY_STATUS';         // Unity 상태

/**
 * Unity Status (통합)
 * Unity 현재 상태 정보
 */
export interface UnityStatus {
  // 기본 상태
  isInitialized: boolean;
  isVisible: boolean;
  isLoading: boolean;
  currentScene: string;
  currentAnimation: UnityAnimationType | null;

  // 성능 정보
  performance: {
    fps: number;
    memoryUsage: number;
    renderTime: number;
  };

  // 캐릭터 매니저 관련 (브리지)
  characterManagerExists: boolean;
  currentSpeed: number;
  timestamp: string;
}


// ==========================================
// Unity Avatar DTO (Swift UnityAvatarDto 구조와 동일)
// ==========================================

/**
 * Unity에서 기대하는 개별 아바타 아이템 구조
 * Unity의 SpriteSettingDto와 매칭됨
 */
export interface UnityAvatarDto {
  name: string;       // 아이템 이름 (예: "New_Armor_01.png")
  part: string;       // Unity 파트명 (예: "Hair", "Cloth", "Pant")
  itemPath: string;   // 전체 경로 (예: "Sprites/Hair/New_Armor_01.png")
  hairColor?: string; // 헤어 색상 (HEX 형식: "#FFFFFF") - Hair 파트에서만 사용
}

/**
 * Unity에서 기대하는 리스트 래퍼 구조
 */
export interface UnityAvatarDtoList {
  list: UnityAvatarDto[];
  hairColor?: string; // 헤어 색상 (HEX 형식: "#FFFFFF")
}

// ==========================================
// Unity Bridge 메인 인터페이스
// ==========================================

export interface UnityBridge {
  // Character Control
  setCharacterSpeed(speed: number): void;
  stopCharacter(): void;
  setCharacterMotion(motion: CharacterMotion): void;

  // Avatar System
  changeAvatar(items: Item[]): void;

  // Unity Status
  getUnityStatus(): void;
}

// ==========================================
// 캐릭터 관련 타입들 (기존 타입과 통합)
// ==========================================

export type CharacterMotion = 'IDLE' | 'MOVE' | 'ATTACK' | 'DAMAGED';

export interface CharacterState {
  motion: CharacterMotion;
  speed: number;
  isMoving: boolean;
  timestamp: string;
}

// ==========================================
// Unity 이벤트 타입들 (확장)
// ==========================================

export interface UnityEvent<T = any> {
  type: string;
  data: T;
  timestamp: string;
}

export interface CharacterStateChangedEvent extends UnityEvent<CharacterState> {
  type: 'CHARACTER_STATE_CHANGED';
  data: CharacterState;
}

export interface AnimationCompleteEvent extends UnityEvent<string> {
  type: 'ANIMATION_COMPLETE';
  data: string; // animation type
}

export interface UnityErrorEvent extends UnityEvent<UnityError> {
  type: 'UNITY_ERROR';
  data: UnityError;
}

export interface UnityStatusEvent extends UnityEvent<UnityStatus> {
  type: 'UNITY_STATUS';
  data: UnityStatus;
}

// ==========================================
// Unity 상태 및 에러 타입들 (통합)
// ==========================================

export interface UnityError {
  type: string;
  message: string;
  error?: string;
  data?: Record<string, unknown>;
}

// ==========================================
// React Native Native Module 인터페이스
// ==========================================

export interface RNUnityBridgeModule {
  // Unity 메시지 전송 (순수 브리지)
  sendUnityMessage(objectName: string, methodName: string, parameter: string): Promise<void>;
  sendUnityJSON(objectName: string, methodName: string, data: unknown[]): Promise<void>;

  // 이벤트 리스너 등록/해제
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}


