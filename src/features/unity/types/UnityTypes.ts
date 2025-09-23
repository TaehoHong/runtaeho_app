/**
 * Unity Types and DTOs
 *
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
 * Unity Event Data
 * Unity에서 React Native로 전달되는 이벤트 데이터
 */
export interface UnityEventData {
  type: UnityEventType;
  data: any;
  timestamp: number;
}

/**
 * Unity Event Type
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
  | 'ACHIEVEMENT_UNLOCKED'; // 업적 달성

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
 * Unity Status
 * Unity 현재 상태 정보
 */
export interface UnityStatus {
  isInitialized: boolean;
  isVisible: boolean;
  isLoading: boolean;
  currentScene: string;
  currentAnimation: UnityAnimationType | null;
  performance: {
    fps: number;
    memoryUsage: number;
    renderTime: number;
  };
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