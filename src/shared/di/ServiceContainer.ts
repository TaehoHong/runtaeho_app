/**
 * 서비스 컨테이너 (Dependency Injection)
 * 의존성 순환을 방지하고 느슨한 결합을 위한 DI 컨테이너
 */

// ==========================================
// 서비스 컨테이너 타입 정의
// ==========================================

export type ServiceFactory<T = any> = () => T;
export type ServiceConstructor<T = any> = new (...args: any[]) => T;

export enum ServiceLifetime {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
  SCOPED = 'scoped',
}

export interface ServiceRegistration<T = any> {
  factory?: ServiceFactory<T>;
  constructor?: ServiceConstructor<T>;
  instance?: T;
  lifetime: ServiceLifetime;
  dependencies?: string[];
}

// ==========================================
// 서비스 컨테이너 구현
// ==========================================

class ServiceContainer {
  private services = new Map<string, ServiceRegistration>();
  private instances = new Map<string, any>();
  private resolving = new Set<string>();

  /**
   * 서비스 등록 - 팩토리 함수
   */
  registerFactory<T>(
    token: string,
    factory: ServiceFactory<T>,
    lifetime: ServiceLifetime = ServiceLifetime.SINGLETON,
    dependencies: string[] = []
  ): ServiceContainer {
    this.services.set(token, {
      factory,
      lifetime,
      dependencies,
    } as ServiceRegistration);
    return this;
  }

  /**
   * 서비스 등록 - 클래스 생성자
   */
  registerClass<T>(
    token: string,
    constructor: ServiceConstructor<T>,
    lifetime: ServiceLifetime = ServiceLifetime.SINGLETON,
    dependencies: string[] = []
  ): ServiceContainer {
    this.services.set(token, {
      constructor,
      lifetime,
      dependencies,
    });
    return this;
  }

  /**
   * 서비스 등록 - 인스턴스
   */
  registerInstance<T>(token: string, instance: T): ServiceContainer {
    this.services.set(token, {
      instance,
      lifetime: ServiceLifetime.SINGLETON,
    } as ServiceRegistration);
    this.instances.set(token, instance);
    return this;
  }

  /**
   * 서비스 해결 (의존성 주입)
   */
  resolve<T>(token: string): T {
    // 순환 의존성 검사
    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected: ${Array.from(this.resolving).join(' -> ')} -> ${token}`);
    }

    const registration = this.services.get(token);
    if (!registration) {
      throw new Error(`Service not registered: ${token}`);
    }

    // Singleton 인스턴스가 이미 있으면 반환
    if (registration.lifetime === ServiceLifetime.SINGLETON && this.instances.has(token)) {
      return this.instances.get(token);
    }

    this.resolving.add(token);

    try {
      let instance: T;

      if (registration.instance) {
        instance = registration.instance;
      } else if (registration.factory) {
        instance = registration.factory();
      } else if (registration.constructor) {
        // 의존성 해결
        const dependencies = registration.dependencies || [];
        const resolvedDependencies = dependencies.map(dep => this.resolve(dep));
        instance = new registration.constructor(...resolvedDependencies);
      } else {
        throw new Error(`No valid registration found for: ${token}`);
      }

      // Singleton 인스턴스 저장
      if (registration.lifetime === ServiceLifetime.SINGLETON) {
        this.instances.set(token, instance);
      }

      return instance;
    } finally {
      this.resolving.delete(token);
    }
  }

  /**
   * 서비스 등록 여부 확인
   */
  isRegistered(token: string): boolean {
    return this.services.has(token);
  }

  /**
   * 서비스 등록 해제
   */
  unregister(token: string): boolean {
    this.instances.delete(token);
    return this.services.delete(token);
  }

  /**
   * 모든 서비스 초기화
   */
  clear(): void {
    this.services.clear();
    this.instances.clear();
    this.resolving.clear();
  }

  /**
   * 등록된 서비스 목록 조회
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * 의존성 그래프 생성
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    this.services.forEach((registration, token) => {
      graph[token] = registration.dependencies || [];
    });

    return graph;
  }
}

// ==========================================
// 전역 컨테이너 인스턴스
// ==========================================

export const container = new ServiceContainer();

// ==========================================
// 서비스 토큰 상수
// ==========================================

export const SERVICE_TOKENS = {
  // API Services (RTK Query)
  RUNNING_API: 'RunningApi',
  USER_API: 'UserApi',

  // Business Services
  RUNNING_SERVICE: 'RunningService',
  AUTH_SERVICE: 'AuthService',
  AVATAR_SERVICE: 'AvatarService',
  STATISTICS_SERVICE: 'StatisticsService',
  USER_SERVICE: 'UserService',

  // Infrastructure Services
  STORAGE_SERVICE: 'StorageService',
  ERROR_SERVICE: 'ErrorService',

  // Unity Services
  UNITY_SERVICE: 'UnityService',
} as const;

// ==========================================
// 데코레이터 (선택적 사용)
// ==========================================

export function Injectable(token?: string) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const serviceToken = token || constructor.name;

    // 자동 등록 (개발 편의성)
    if (!container.isRegistered(serviceToken)) {
      container.registerClass(serviceToken, constructor);
    }

    return constructor;
  };
}

// 메타데이터 없이 간단한 의존성 주입 마커
export function Inject(token: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // 메타데이터 대신 심볼이나 다른 방식으로 의존성 추적 가능
    console.log(`Injecting ${token} into ${target.constructor.name} at position ${parameterIndex}`);
  };
}