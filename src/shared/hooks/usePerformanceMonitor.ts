/**
 * 성능 모니터링 Hook
 * React 컴포넌트의 렌더링 성능을 모니터링
 */

import { useEffect, useRef, useCallback } from 'react';

// ==========================================
// 렌더링 성능 모니터링
// ==========================================

export const useRenderPerformanceMonitor = (componentName: string, enabled: boolean = __DEV__) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef<number>(0);
  const mountTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    mountTime.current = performance.now();
    console.log(`🏁 [${componentName}] 컴포넌트 마운트`);

    return () => {
      const totalLifetime = performance.now() - mountTime.current;
      console.log(`🏁 [${componentName}] 컴포넌트 언마운트 (총 생명주기: ${totalLifetime.toFixed(2)}ms)`);
    };
  }, [componentName, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const currentTime = performance.now();
    renderCount.current += 1;

    if (lastRenderTime.current > 0) {
      const timeBetweenRenders = currentTime - lastRenderTime.current;
      console.log(`🔄 [${componentName}] 렌더링 #${renderCount.current} (이전 렌더링으로부터 ${timeBetweenRenders.toFixed(2)}ms 후)`);
    } else {
      console.log(`🔄 [${componentName}] 초기 렌더링`);
    }

    lastRenderTime.current = currentTime;
  });

  const logPerformanceInfo = useCallback(() => {
    if (!enabled) return;

    const totalLifetime = performance.now() - mountTime.current;
    console.log(`📊 [${componentName}] 성능 정보:`, {
      totalRenders: renderCount.current,
      totalLifetime: `${totalLifetime.toFixed(2)}ms`,
      averageRenderInterval: renderCount.current > 1
        ? `${(totalLifetime / (renderCount.current - 1)).toFixed(2)}ms`
        : 'N/A',
    });
  }, [componentName, enabled]);

  return {
    renderCount: renderCount.current,
    logPerformanceInfo,
  };
};

// ==========================================
// 메모리 사용량 모니터링
// ==========================================

export const useMemoryMonitor = (componentName: string, enabled: boolean = __DEV__) => {
  const checkMemory = useCallback(() => {
    if (!enabled) return;

    // React Native에서는 performance.memory가 제한적이므로
    // 개발 모드에서만 간단한 로깅
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      const memoryInfo = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      };
      console.log(`💾 [${componentName}] 메모리 사용량:`, memoryInfo, 'MB');
    } else {
      console.log(`💾 [${componentName}] 메모리 모니터링을 지원하지 않는 환경입니다.`);
    }
  }, [componentName, enabled]);

  useEffect(() => {
    if (!enabled) return;

    checkMemory();

    // 컴포넌트 언마운트 시에도 체크
    return () => {
      checkMemory();
    };
  }, [checkMemory, enabled]);

  return { checkMemory };
};

// ==========================================
// 복합 성능 모니터링
// ==========================================

export const usePerformanceMonitor = (
  componentName: string,
  options: {
    enableRenderMonitor?: boolean;
    enableMemoryMonitor?: boolean;
    logInterval?: number;
  } = {}
) => {
  const {
    enableRenderMonitor = __DEV__,
    enableMemoryMonitor = __DEV__,
    logInterval = 10000, // 10초마다 로깅
  } = options;

  const renderMonitor = useRenderPerformanceMonitor(componentName, enableRenderMonitor);
  const memoryMonitor = useMemoryMonitor(componentName, enableMemoryMonitor);

  // 주기적으로 성능 정보 로깅
  useEffect(() => {
    if (!enableRenderMonitor && !enableMemoryMonitor) return;

    const interval = setInterval(() => {
      renderMonitor.logPerformanceInfo();
      memoryMonitor.checkMemory();
    }, logInterval);

    return () => clearInterval(interval);
  }, [renderMonitor, memoryMonitor, logInterval, enableRenderMonitor, enableMemoryMonitor]);

  return {
    ...renderMonitor,
    ...memoryMonitor,
  };
};