/**
 * 서비스 등록 및 초기화
 * DI 컨테이너에 애플리케이션 서비스들을 등록
 */

import { container, SERVICE_TOKENS, ServiceLifetime } from './ServiceContainer';

// Business Services
import { AuthenticationService } from '../../features/auth/services/AuthenticationService';
import { AvatarService } from '../../features/avatar/services/AvatarService';
import { RunningService } from '../../features/running/services/RunningService';
// Note: StatisticsService는 React Query로 마이그레이션되어 DI 컨테이너에서 제외
// import { statisticsService } from '../../features/statistics/services/statisticsService';
import { UserService } from '../../features/user/services/UserService';

// Infrastructure Services
import { ErrorService } from '../../shared/services/ErrorService';
import { UserStateManager } from '../services/userStateManager';

// Unity Services
import { UnityService } from '../../features/unity/services/UnityService';

// ==========================================
// 서비스 등록 함수
// ==========================================

export const registerServices = () => {
  // Infrastructure Services (최하위 레이어)
  container.registerFactory(
    SERVICE_TOKENS.STORAGE_SERVICE,
    () => UserStateManager.getInstance(),
    ServiceLifetime.SINGLETON
  );

  container.registerFactory(
    SERVICE_TOKENS.ERROR_SERVICE,
    () => ErrorService.getInstance(),
    ServiceLifetime.SINGLETON
  );

  // Business Services (Singleton 패턴 사용)
  container.registerFactory(
    SERVICE_TOKENS.RUNNING_SERVICE,
    () => RunningService.getInstance(),
    ServiceLifetime.SINGLETON
  );

  container.registerFactory(
    SERVICE_TOKENS.AUTH_SERVICE,
    () => AuthenticationService.getInstance(),
    ServiceLifetime.SINGLETON
  );

  container.registerFactory(
    SERVICE_TOKENS.AVATAR_SERVICE,
    () => AvatarService.getInstance(),
    ServiceLifetime.SINGLETON
  );

  // Statistics Service는 React Query로 마이그레이션되어 DI 컨테이너에서 제외
  // container.registerFactory(
  //   SERVICE_TOKENS.STATISTICS_SERVICE,
  //   () => statisticsService,
  //   ServiceLifetime.SINGLETON
  // );

  container.registerFactory(
    SERVICE_TOKENS.USER_SERVICE,
    () => UserService.getInstance(),
    ServiceLifetime.SINGLETON
  );

  // Unity Services
  container.registerFactory(
    SERVICE_TOKENS.UNITY_SERVICE,
    () => UnityService.getInstance(),
    ServiceLifetime.SINGLETON
  );

  console.log('🔧 [DI Container] 모든 서비스 등록 완료');
  console.log('📊 [DI Container] 등록된 서비스:', container.getRegisteredServices());
};

// ==========================================
// 서비스 가져오기 헬퍼 함수들
// ==========================================

export const getRunningService = () => container.resolve<RunningService>(SERVICE_TOKENS.RUNNING_SERVICE);
export const getAuthService = () => container.resolve<AuthenticationService>(SERVICE_TOKENS.AUTH_SERVICE);
export const getAvatarService = () => container.resolve<AvatarService>(SERVICE_TOKENS.AVATAR_SERVICE);
// Statistics Service는 React Query hooks로 대체됨 (useGetStatisticsSummary 등)
// export const getStatisticsService = () => container.resolve<StatisticsService>(SERVICE_TOKENS.STATISTICS_SERVICE);
export const getUserService = () => container.resolve<UserService>(SERVICE_TOKENS.USER_SERVICE);
export const getUnityService = () => container.resolve<UnityService>(SERVICE_TOKENS.UNITY_SERVICE);
export const getStorageService = () => container.resolve<UserStateManager>(SERVICE_TOKENS.STORAGE_SERVICE);

// ==========================================
// 의존성 분석 및 검증
// ==========================================

export const analyzeDependencies = () => {
  const dependencyGraph = container.getDependencyGraph();

  console.log('📈 [DI Container] 의존성 그래프:', dependencyGraph);

  // 순환 의존성 검사
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const detectCycle = (service: string, path: string[] = []): boolean => {
    if (recursionStack.has(service)) {
      cycles.push([...path, service]);
      return true;
    }

    if (visited.has(service)) {
      return false;
    }

    visited.add(service);
    recursionStack.add(service);

    const dependencies = dependencyGraph[service] || [];
    for (const dependency of dependencies) {
      if (detectCycle(dependency, [...path, service])) {
        return true;
      }
    }

    recursionStack.delete(service);
    return false;
  };

  // 모든 서비스에 대해 순환 의존성 검사
  Object.keys(dependencyGraph).forEach(service => {
    if (!visited.has(service)) {
      detectCycle(service);
    }
  });

  if (cycles.length > 0) {
    console.warn('⚠️ [DI Container] 순환 의존성 발견:', cycles);
  } else {
    console.log('✅ [DI Container] 순환 의존성 없음');
  }

  return {
    dependencyGraph,
    cycles,
    totalServices: Object.keys(dependencyGraph).length,
  };
};