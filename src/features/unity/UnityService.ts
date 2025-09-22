/**
 * Unity Service Placeholder
 *
 * 향후 Unity 연동을 위한 인터페이스 준비
 * Swift Unity 관련 코드에서 마이그레이션 예정
 */

// TODO: Unity 연동 구현
// Swift UnityService.swift 참조:
// - UnityAvatarDto
// - UnityViewController
// - UnityBridge
// - Unity character visualization

export interface UnityAvatarDto {
  // TODO: Swift UnityAvatarDto에서 마이그레이션
  id?: number;
}

export interface UnityServiceInterface {
  // TODO: Unity 관련 메서드들 정의
  // loadCharacter(): Promise<void>;
  // updateAvatar(avatar: UnityAvatarDto): Promise<void>;
  // showRunningAnimation(): Promise<void>;
  init(): void;
}

// 현재는 주석 처리된 상태로 구조만 준비
export class UnityService implements UnityServiceInterface {
  private static instance: UnityService;

  private constructor() {
    // Unity 초기화 로직은 나중에 구현
  }

  static getInstance(): UnityService {
    if (!UnityService.instance) {
      UnityService.instance = new UnityService();
    }
    return UnityService.instance;
  }

  init(): void {
    // TODO: Unity 초기화 로직 구현
  }

  // TODO: Unity 메서드들 구현
}

export const unityService = UnityService.getInstance();