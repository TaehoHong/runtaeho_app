/**
 * Unity Types and DTOs
 *
 * Unity Bridge 관련 TypeScript 타입 정의
 * React Native와 Unity 간의 통신을 위한 인터페이스들
 * Swift Unity 관련 타입들을 TypeScript로 마이그레이션
 * UnityAvatarDto, UnityViewController 등 Swift 코드 참조
 */

/**
 * Unity Avatar DTO
 * Swift UnityAvatarDto 대응
 */
export interface UnityAvatarDto {
  id: number;
  userId: number;

  // 캐릭터 기본 정보
  characterType?: string;
  gender?: 'MALE' | 'FEMALE';

  // 아이템 정보
  hair?: UnityItemData;
  top?: UnityItemData;
  bottom?: UnityItemData;
  shoes?: UnityItemData;
  accessory?: UnityItemData;

  // Unity 전용 데이터
  unityFilePath?: string;
  animationSet?: string;
  scale?: number;
  position?: UnityVector3;
  rotation?: UnityVector3;

  // 추가 설정
  skinColor?: string;
  hairColor?: string;
  eyeColor?: string;
}

/**
 * Unity Item Data
 * Unity에서 사용할 아이템 정보
 */
export interface UnityItemData {
  id: number;
  name: string;
  category: 'HAIR' | 'TOP' | 'BOTTOM' | 'SHOES' | 'ACCESSORY';
  unityFilePath?: string;
  thumbnailPath?: string;
  color?: string;
  material?: string;
  layer?: number;
}

/**
 * Unity Running DTO
 * 러닝 중 Unity로 전달할 데이터
 */
export interface UnityRunningDto {
  // 러닝 상태
  isRunning: boolean;
  isPaused: boolean;

  // 러닝 데이터
  distance: number;        // 거리 (미터)
  duration: number;        // 시간 (초)
  pace: number;           // 페이스 (분/km)
  speed: number;          // 속도 (km/h)
  calories: number;       // 칼로리

  // 실시간 위치
  latitude?: number;
  longitude?: number;
  altitude?: number;

  // Unity 애니메이션 제어
  animationSpeed: number;
  movementDirection: UnityVector3;

  // 환경 정보
  weather?: string;
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
}

/**
 * Unity Background DTO
 * Unity 배경 설정용 데이터
 */
export interface UnityBackgroundDto {
  type: 'PARK' | 'BEACH' | 'CITY' | 'MOUNTAIN' | 'TRACK' | 'CUSTOM';
  sceneName: string;
  assetPath?: string;

  // 환경 설정
  weather: 'SUNNY' | 'CLOUDY' | 'RAINY' | 'SNOWY';
  timeOfDay: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

  // 조명 설정
  lighting?: {
    intensity: number;
    color: string;
    direction: UnityVector3;
  };

  // 음향 설정
  ambientSound?: string;
  musicTrack?: string;
}

/**
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
 * Unity Vector3
 * Unity 3D 벡터 좌표
 */
export interface UnityVector3 {
  x: number;
  y: number;
  z: number;
}

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
 * Unity Configuration
 * Unity 초기 설정 데이터
 */
export interface UnityConfiguration {
  // 그래픽 설정
  quality: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;

  // 사운드 설정
  masterVolume: number;
  effectVolume: number;
  musicVolume: number;

  // 기본 설정
  enableHapticFeedback: boolean;
  enableParticleEffects: boolean;
  enableShadows: boolean;
  enablePostProcessing: boolean;

  // 디버그 설정
  debugMode: boolean;
  showFPS: boolean;
  logLevel: 'NONE' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';
}

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

/**
 * Unity Bridge Message
 * Unity와 React Native 간 메시지 전달용
 */
export interface UnityBridgeMessage {
  id: string;
  type: 'COMMAND' | 'QUERY' | 'EVENT' | 'RESPONSE';
  method: string;
  params?: any;
  timestamp: number;
}

/**
 * Unity Avatar Update Options
 * 아바타 업데이트 시 사용할 옵션
 */
export interface UnityAvatarUpdateOptions {
  animateTransition: boolean;
  transitionDuration: number;
  playEquipSound: boolean;
  showParticleEffect: boolean;
  saveToPreferences: boolean;
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
  changeAvatar(items: AvatarItem[]): void;

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
// 아바타 시스템 타입들 (기존 타입과 통합)
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
// Unity 상태 및 에러 타입들 (통합)
// ==========================================

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