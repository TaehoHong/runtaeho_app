/**
 * Permission Manager (Refactored)
 *
 * 확장성/가독성/유지보수성 개선:
 * - Strategy Pattern으로 권한별 로직 분리
 * - 선언적 플로우 설정으로 복잡도 감소
 * - Observer Pattern으로 상태 변경 구독 지원
 * - 권한 상태 영구 저장
 *
 * 사용 예시:
 * ```typescript
 * const manager = PermissionManager.getInstance();
 *
 * // 단일 권한 요청
 * const result = await manager.requestPermission(PermissionType.LOCATION_FOREGROUND);
 *
 * // 플로우 기반 요청
 * const flowResult = await manager.executeFlow('login');
 *
 * // 상태 구독
 * manager.subscribe((statuses) => {
 *   console.log('Permission changed:', statuses);
 * });
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PermissionType,
  PermissionStatus,
  PermissionResult,
  PermissionFlow,
  PermissionFlowStep,
} from '../models/PermissionTypes';
import { PermissionStrategyFactory } from '../strategies/PermissionStrategyFactory';
import { PERMISSION_FLOWS } from '../config/permissionFlows';

/**
 * 권한 플로우 실행 결과
 */
export interface FlowExecutionResult {
  flowId: string;
  success: boolean;
  completedSteps: PermissionResult[];
  failedStep?: {
    step: PermissionFlowStep;
    result: PermissionResult;
  };
  aborted: boolean;
}

/**
 * 권한 상태 변경 리스너
 */
type PermissionChangeListener = (
  statuses: Map<PermissionType, PermissionResult>
) => void;

/**
 * Permission Manager
 */
export class PermissionManager {
  private static instance: PermissionManager;
  private permissionStatuses = new Map<PermissionType, PermissionResult>();
  private listeners: Set<PermissionChangeListener> = new Set();

  private static readonly STORAGE_KEY = '@permissions_status';

  private constructor() {
    this.loadPersistedStatuses();
  }

  /**
   * Singleton 인스턴스
   */
  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * 단일 권한 요청
   */
  async requestPermission(type: PermissionType): Promise<PermissionResult> {
    console.log(`[PermissionManager] Requesting permission: ${type}`);

    try {
      const strategy = PermissionStrategyFactory.getStrategy(type);

      // 플랫폼 지원 여부 확인
      if (!strategy.isSupported()) {
        console.warn(
          `[PermissionManager] Permission ${type} not supported on this platform`
        );
        const result: PermissionResult = {
          type,
          status: PermissionStatus.DENIED,
          canAskAgain: false,
          timestamp: Date.now(),
        };
        this.updateStatus(type, result);
        return result;
      }

      // Rationale 표시 필요 여부 확인
      const shouldShowRationale = await strategy.shouldShowRationale();
      if (shouldShowRationale) {
        console.log(
          `[PermissionManager] Should show rationale for ${type} before requesting`
        );
        // TODO: Rationale UI 표시 (Modal 등)
        // await this.showRationale(type);
      }

      // 권한 요청
      const result = await strategy.requestPermission();

      // 상태 업데이트 및 영구 저장
      this.updateStatus(type, result);

      console.log(
        `[PermissionManager] Permission ${type} result: ${result.status}`
      );

      return result;
    } catch (error) {
      console.error(
        `[PermissionManager] Request permission ${type} failed:`,
        error
      );

      const errorResult: PermissionResult = {
        type,
        status: PermissionStatus.DENIED,
        canAskAgain: false,
        timestamp: Date.now(),
      };

      this.updateStatus(type, errorResult);
      return errorResult;
    }
  }

  /**
   * 단일 권한 상태 확인 (요청하지 않고 현재 상태만)
   */
  async checkPermission(type: PermissionType): Promise<PermissionResult> {
    console.log(`[PermissionManager] Checking permission: ${type}`);

    try {
      const strategy = PermissionStrategyFactory.getStrategy(type);

      if (!strategy.isSupported()) {
        const result: PermissionResult = {
          type,
          status: PermissionStatus.DENIED,
          canAskAgain: false,
          timestamp: Date.now(),
        };
        return result;
      }

      const result = await strategy.checkPermission();
      this.updateStatus(type, result);

      return result;
    } catch (error) {
      console.error(
        `[PermissionManager] Check permission ${type} failed:`,
        error
      );

      return {
        type,
        status: PermissionStatus.DENIED,
        canAskAgain: false,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 여러 권한 상태 확인
   */
  async checkMultiplePermissions(
    types: PermissionType[]
  ): Promise<Map<PermissionType, PermissionResult>> {
    const results = new Map<PermissionType, PermissionResult>();

    await Promise.all(
      types.map(async (type) => {
        const result = await this.checkPermission(type);
        results.set(type, result);
      })
    );

    return results;
  }

  /**
   * 권한 플로우 실행
   *
   * Chain of Responsibility Pattern
   * 선언적 설정에 따라 순차적으로 권한 요청
   */
  async executeFlow(flowId: string): Promise<FlowExecutionResult> {
    console.log(`[PermissionManager] Executing flow: ${flowId}`);

    const flow = PERMISSION_FLOWS[flowId];

    if (!flow) {
      throw new Error(
        `[PermissionManager] Flow not found: ${flowId}. Available flows: ${Object.keys(
          PERMISSION_FLOWS
        ).join(', ')}`
      );
    }

    const completedSteps: PermissionResult[] = [];
    let aborted = false;

    for (const step of flow.steps) {
      console.log(
        `[PermissionManager] Flow step: ${step.permission}, onDenied: ${step.onDenied}`
      );

      // 권한 요청
      const result = await this.requestPermission(step.permission);
      completedSteps.push(result);

      // 결과 처리
      if (result.status !== PermissionStatus.GRANTED) {
        console.warn(
          `[PermissionManager] Permission ${step.permission} not granted: ${result.status}`
        );

        // 거부 시 동작
        switch (step.onDenied) {
          case 'abort':
            console.log(
              `[PermissionManager] Flow aborted due to ${step.permission} denial`
            );
            aborted = true;
            return {
              flowId,
              success: false,
              completedSteps,
              failedStep: { step, result },
              aborted: true,
            };

          case 'skip':
            console.log(
              `[PermissionManager] Skipping ${step.permission}, continuing flow`
            );
            continue;

          case 'continue':
          default:
            console.log(
              `[PermissionManager] Continuing flow despite ${step.permission} denial`
            );
            continue;
        }
      }

      console.log(
        `[PermissionManager] Permission ${step.permission} granted, continuing`
      );
    }

    console.log(
      `[PermissionManager] Flow ${flowId} completed successfully`
    );

    return {
      flowId,
      success: true,
      completedSteps,
      aborted: false,
    };
  }

  /**
   * 설정 화면으로 이동
   */
  async openSettings(type: PermissionType): Promise<void> {
    console.log(`[PermissionManager] Opening settings for ${type}`);

    try {
      const strategy = PermissionStrategyFactory.getStrategy(type);
      await strategy.openSettings();
    } catch (error) {
      console.error(
        `[PermissionManager] Open settings for ${type} failed:`,
        error
      );
    }
  }

  /**
   * 현재 저장된 권한 상태 조회
   */
  getPermissionStatus(type: PermissionType): PermissionResult | undefined {
    return this.permissionStatuses.get(type);
  }

  /**
   * 모든 권한 상태 조회
   */
  getAllPermissionStatuses(): Map<PermissionType, PermissionResult> {
    return new Map(this.permissionStatuses);
  }

  /**
   * 권한 상태 변경 구독
   *
   * Observer Pattern
   */
  subscribe(listener: PermissionChangeListener): () => void {
    this.listeners.add(listener);

    // 즉시 현재 상태 전달
    listener(this.getAllPermissionStatuses());

    // Unsubscribe 함수 반환
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 권한 상태 업데이트 및 리스너 통지
   */
  private updateStatus(type: PermissionType, result: PermissionResult): void {
    this.permissionStatuses.set(type, result);
    this.persistStatuses();
    this.notifyListeners();
  }

  /**
   * 리스너들에게 상태 변경 통지
   */
  private notifyListeners(): void {
    const statuses = this.getAllPermissionStatuses();
    this.listeners.forEach((listener) => listener(statuses));
  }

  /**
   * 권한 상태 영구 저장
   */
  private async persistStatuses(): Promise<void> {
    try {
      const data = Array.from(this.permissionStatuses.entries());
      await AsyncStorage.setItem(
        PermissionManager.STORAGE_KEY,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('[PermissionManager] Failed to persist statuses:', error);
    }
  }

  /**
   * 저장된 권한 상태 불러오기
   */
  private async loadPersistedStatuses(): Promise<void> {
    try {
      const json = await AsyncStorage.getItem(PermissionManager.STORAGE_KEY);
      if (json) {
        const data = JSON.parse(json) as Array<
          [PermissionType, PermissionResult]
        >;
        this.permissionStatuses = new Map(data);
        console.log(
          `[PermissionManager] Loaded ${this.permissionStatuses.size} persisted statuses`
        );
      }
    } catch (error) {
      console.error(
        '[PermissionManager] Failed to load persisted statuses:',
        error
      );
    }
  }

  /**
   * 저장된 권한 상태 초기화 (테스트/디버그용)
   */
  async clearPersistedStatuses(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PermissionManager.STORAGE_KEY);
      this.permissionStatuses.clear();
      this.notifyListeners();
      console.log('[PermissionManager] Cleared all persisted statuses');
    } catch (error) {
      console.error(
        '[PermissionManager] Failed to clear persisted statuses:',
        error
      );
    }
  }
}

// Singleton export
export const permissionManager = PermissionManager.getInstance();
