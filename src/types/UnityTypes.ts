/**
 * Unity Bridge 관련 TypeScript 타입 정의
 * React Native와 Unity 간의 통신을 위한 인터페이스들
 */

// ==========================================
// Unity Bridge 메인 인터페이스
// ==========================================

export interface UnityBridge {
  // Character Control
  setCharacterSpeed(speed: number): void;
  stopCharacter(): void;
  setCharacterMotion(motion: CharacterMotion): void;

  // Avatar System
  changeAvatar(items: AvatarItem[]): void;

  // Unity Status
  getUnityStatus(): void;
}

// ==========================================
// 캐릭터 관련 타입들
// ==========================================

export type CharacterMotion = 'IDLE' | 'MOVE' | 'ATTACK' | 'DAMAGED';

export interface CharacterState {
  motion: CharacterMotion;
  speed: number;
  isMoving: boolean;
  timestamp: string;
}

// ==========================================
// 아바타 시스템 타입들
// ==========================================

export interface AvatarItem {
  name: string;
  part: AvatarPartType;
  itemPath: string;
}

export type AvatarPartType = 'Hair' | 'Cloth' | 'Pant' | 'Shoes' | 'Accessory';

export interface AvatarData {
  items: AvatarItem[];
  timestamp: string;
}

// ==========================================
// Unity 이벤트 타입들
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

export interface AvatarChangedEvent extends UnityEvent<AvatarData> {
  type: 'AVATAR_CHANGED';
  data: AvatarData;
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
// Unity 상태 및 에러 타입들
// ==========================================

export interface UnityStatus {
  characterManagerExists: boolean;
  currentSpeed: number;
  timestamp: string;
}

export interface UnityError {
  type: string;
  message: string;
  error?: string;
  data?: Record<string, unknown>;
}

// ==========================================
// Unity Bridge 이벤트 리스너 타입들
// ==========================================

export type UnityEventListener<T = any> = (event: T) => void;

export interface UnityEventListeners {
  onCharacterStateChanged?: UnityEventListener<CharacterStateChangedEvent>;
  onAvatarChanged?: UnityEventListener<AvatarChangedEvent>;
  onAvatarChangeError?: UnityEventListener<UnityErrorEvent>;
  onAnimationComplete?: UnityEventListener<AnimationCompleteEvent>;
  onUnityStatus?: UnityEventListener<UnityStatusEvent>;
  onUnityError?: UnityEventListener<UnityErrorEvent>;
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

// ==========================================
// Unity Bridge Configuration
// ==========================================

export interface UnityBridgeConfig {
  enableDebugLogs?: boolean;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  eventBufferSize?: number;
}

// ==========================================
// Unity Bridge Context (React Context용)
// ==========================================

export interface UnityBridgeContextValue {
  // Connection Status
  isConnected: boolean;
  isLoading: boolean;
  error: UnityError | null;

  // Character State
  characterState: CharacterState | null;

  // Avatar State
  currentAvatar: AvatarData | null;

  // Unity Control Methods
  setCharacterSpeed: (speed: number) => Promise<void>;
  stopCharacter: () => Promise<void>;
  setCharacterMotion: (motion: CharacterMotion) => Promise<void>;
  changeAvatar: (items: AvatarItem[]) => Promise<void>;

  // Unity Status
  getUnityStatus: () => Promise<void>;
  unityStatus: UnityStatus | null;

  // Event Listeners
  addEventListener: <T>(eventName: string, listener: UnityEventListener<T>) => void;
  removeEventListener: (eventName: string) => void;

  // Configuration
  config: UnityBridgeConfig;
  updateConfig: (config: Partial<UnityBridgeConfig>) => void;
}

// ==========================================
// Utility Types
// ==========================================

export type UnityBridgeAction =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: UnityError | null }
  | { type: 'SET_CHARACTER_STATE'; payload: CharacterState }
  | { type: 'SET_AVATAR_DATA'; payload: AvatarData }
  | { type: 'SET_UNITY_STATUS'; payload: UnityStatus }
  | { type: 'UPDATE_CONFIG'; payload: Partial<UnityBridgeConfig> };

export interface UnityBridgeState {
  isConnected: boolean;
  isLoading: boolean;
  error: UnityError | null;
  characterState: CharacterState | null;
  currentAvatar: AvatarData | null;
  unityStatus: UnityStatus | null;
  config: UnityBridgeConfig;
}

// ==========================================
// Default Values
// ==========================================

export const DEFAULT_UNITY_BRIDGE_CONFIG: UnityBridgeConfig = {
  enableDebugLogs: __DEV__,
  autoConnect: true,
  reconnectAttempts: 3,
  eventBufferSize: 50,
};

export const DEFAULT_CHARACTER_STATE: CharacterState = {
  motion: 'IDLE',
  speed: 0,
  isMoving: false,
  timestamp: new Date().toISOString(),
};

export const DEFAULT_UNITY_BRIDGE_STATE: UnityBridgeState = {
  isConnected: false,
  isLoading: false,
  error: null,
  characterState: DEFAULT_CHARACTER_STATE,
  currentAvatar: null,
  unityStatus: null,
  config: DEFAULT_UNITY_BRIDGE_CONFIG,
};