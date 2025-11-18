/**
 * Permission Strategy Factory
 *
 * Factory Pattern 구현
 * 권한 타입에 맞는 전략 객체 생성
 *
 * 확장성: 새로운 권한 추가 시 이 파일에 전략 등록만 하면 됨
 */

import { PermissionType } from '../models/PermissionTypes';
import { IPermissionStrategy } from './PermissionStrategy';
import { LocationForegroundStrategy } from './LocationForegroundStrategy';
import { LocationBackgroundStrategy } from './LocationBackgroundStrategy';
import { NotificationStrategy } from './NotificationStrategy';

/**
 * 권한 타입별 전략 매핑
 */
const strategyMap = new Map<PermissionType, () => IPermissionStrategy>([
  [PermissionType.LOCATION_FOREGROUND, () => new LocationForegroundStrategy()],
  [PermissionType.LOCATION_BACKGROUND, () => new LocationBackgroundStrategy()],
  [PermissionType.NOTIFICATION, () => new NotificationStrategy()],
  // TODO: 추가 권한 전략
  // [PermissionType.HEALTH_KIT, () => new HealthKitStrategy()],
  // [PermissionType.GOOGLE_FIT, () => new GoogleFitStrategy()],
  // [PermissionType.MOTION, () => new MotionStrategy()],
]);

/**
 * Permission Strategy Factory
 */
export class PermissionStrategyFactory {
  private static strategies = new Map<PermissionType, IPermissionStrategy>();

  /**
   * 권한 타입에 해당하는 전략 가져오기 (Singleton)
   */
  static getStrategy(type: PermissionType): IPermissionStrategy {
    // 캐싱된 인스턴스가 있으면 반환
    if (this.strategies.has(type)) {
      return this.strategies.get(type)!;
    }

    // 새 인스턴스 생성
    const strategyFactory = strategyMap.get(type);

    if (!strategyFactory) {
      throw new Error(
        `[PermissionStrategyFactory] No strategy found for permission type: ${type}`
      );
    }

    const strategy = strategyFactory();
    this.strategies.set(type, strategy);

    return strategy;
  }

  /**
   * 모든 등록된 전략 가져오기
   */
  static getAllStrategies(): IPermissionStrategy[] {
    return Array.from(strategyMap.keys()).map((type) =>
      this.getStrategy(type)
    );
  }

  /**
   * 지원되는 권한 타입 목록
   */
  static getSupportedTypes(): PermissionType[] {
    return Array.from(strategyMap.keys()).filter((type) => {
      const strategy = this.getStrategy(type);
      return strategy.isSupported();
    });
  }

  /**
   * 특정 권한 타입 지원 여부
   */
  static isSupported(type: PermissionType): boolean {
    try {
      const strategy = this.getStrategy(type);
      return strategy.isSupported();
    } catch {
      return false;
    }
  }

  /**
   * 캐시 초기화 (테스트용)
   */
  static clearCache(): void {
    this.strategies.clear();
  }
}
