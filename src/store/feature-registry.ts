import { Middleware, Reducer } from '@reduxjs/toolkit';
import { authApi } from './api/authApi';
import authSlice from './slices/authSlice';
import userSlice from './slices/userSlice';
import unitySlice from './slices/unitySlice';

/**
 * Feature 설정 인터페이스
 */
export interface FeatureConfig {
  api?: {
    reducer: Reducer;
    middleware: Middleware;
    reducerPath: string;
  };
  slice?: {
    reducer: Reducer;
    name: string;
  };
  middleware?: Middleware;
  enabled: boolean;
}

/**
 * 기능별 설정 레지스트리
 * 새로운 feature 추가 시 여기에만 추가하면 됨
 */
export const FEATURE_REGISTRY: Record<string, FeatureConfig> = {
  baseApi: {
    api: {
      reducer: authApi.reducer,
      middleware: authApi.middleware,
      reducerPath: authApi.reducerPath,
    },
    enabled: true,
  },
  auth: {
    slice: {
      reducer: authSlice,
      name: 'auth',
    },
    enabled: true,
  },
  user: {
    slice: {
      reducer: userSlice,
      name: 'user',
    },
    enabled: true,
  },
  unity: {
    slice: {
      reducer: unitySlice,
      name: 'unity',
    },
    enabled: true,
  },
};

/**
 * 활성화된 feature들의 reducer와 middleware를 동적으로 생성
 */
export const getEnabledFeatures = () => {
  const reducers: Record<string, Reducer> = {};
  const middlewares: Middleware[] = [];

  Object.entries(FEATURE_REGISTRY).forEach(([featureName, config]) => {
    if (!config.enabled) {
      console.log(`Feature '${featureName}' is disabled`);
      return;
    }

    // API reducer 추가
    if (config.api) {
      reducers[config.api.reducerPath] = config.api.reducer;
      middlewares.push(config.api.middleware);
    }

    // Slice reducer 추가
    if (config.slice) {
      reducers[config.slice.name] = config.slice.reducer;
    }

    // 추가 middleware 등록
    if (config.middleware) {
      middlewares.push(config.middleware);
    }
  });

  return {
    reducers,
    middlewares,
  };
};

/**
 * 특정 feature 활성화/비활성화
 */
export const toggleFeature = (featureName: string, enabled: boolean): void => {
  if (FEATURE_REGISTRY[featureName]) {
    FEATURE_REGISTRY[featureName].enabled = enabled;
    console.log(`Feature '${featureName}' ${enabled ? 'enabled' : 'disabled'}`);
  } else {
    console.warn(`Feature '${featureName}' not found in registry`);
  }
};

/**
 * 활성화된 feature 목록 반환
 */
export const getActiveFeatures = (): string[] => {
  return Object.entries(FEATURE_REGISTRY)
    .filter(([, config]) => config.enabled)
    .map(([featureName]) => featureName);
};

/**
 * Feature 등록 유틸리티
 * 새로운 feature를 런타임에 추가할 때 사용
 */
export const registerFeature = (
  featureName: string,
  config: FeatureConfig
): void => {
  if (FEATURE_REGISTRY[featureName]) {
    console.warn(`Feature '${featureName}' already exists. Overwriting...`);
  }

  FEATURE_REGISTRY[featureName] = config;
  console.log(`Feature '${featureName}' registered successfully`);
};

/**
 * Feature 제거 유틸리티
 */
export const unregisterFeature = (featureName: string): void => {
  if (FEATURE_REGISTRY[featureName]) {
    delete FEATURE_REGISTRY[featureName];
    console.log(`Feature '${featureName}' unregistered successfully`);
  } else {
    console.warn(`Feature '${featureName}' not found in registry`);
  }
};

/**
 * 개발 환경에서 feature 상태 디버깅
 */
export const debugFeatures = (): void => {
  if (__DEV__) {
    console.group('🔧 Feature Registry Debug');
    Object.entries(FEATURE_REGISTRY).forEach(([featureName, config]) => {
      console.log(`${featureName}: ${config.enabled ? '✅' : '❌'}`);
      if (config.api) {
        console.log(`  - API: ${config.api.reducerPath}`);
      }
      if (config.slice) {
        console.log(`  - Slice: ${config.slice.name}`);
      }
    });
    console.groupEnd();
  }
};