import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 디바운스 값 Hook
 * 값이 변경된 후 지정된 딜레이 후에 업데이트됨
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * 디바운스 콜백 Hook
 * 함수 호출을 디바운스 처리
 */
export const useDebounceCallback = <T extends any[]>(
  callback: (...args: T) => void,
  delay: number
) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const debouncedCallback = useCallback(
    (...args: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const flush = useCallback(
    (...args: T) => {
      cancel();
      callback(...args);
    },
    [callback, cancel]
  );

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    debouncedCallback,
    cancel,
    flush,
  };
};

/**
 * 비동기 디바운스 Hook
 * 비동기 함수의 호출을 디바운스 처리
 */
export const useAsyncDebounce = <T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>,
  delay: number
) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resolveRef = useRef<((value: R) => void) | null>(null);
  const rejectRef = useRef<((reason?: any) => void) | null>(null);

  const debouncedAsyncFn = useCallback(
    (...args: T): Promise<R> => {
      return new Promise((resolve, reject) => {
        // 이전 타이머와 Promise 정리
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (rejectRef.current) {
          rejectRef.current(new Error('Debounced'));
        }

        resolveRef.current = resolve;
        rejectRef.current = reject;

        timeoutRef.current = setTimeout(async () => {
          try {
            const result = await asyncFn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            resolveRef.current = null;
            rejectRef.current = null;
          }
        }, delay);
      });
    },
    [asyncFn, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (rejectRef.current) {
      rejectRef.current(new Error('Cancelled'));
      rejectRef.current = null;
    }
    resolveRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    debouncedAsyncFn,
    cancel,
  };
};

/**
 * 쓰로틀 Hook
 * 함수 호출을 쓰로틀 처리 (지정된 시간 간격으로만 실행)
 */
export const useThrottle = <T extends any[]>(
  callback: (...args: T) => void,
  delay: number
) => {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const throttledCallback = useCallback(
    (...args: T) => {
      const now = Date.now();

      if (now - lastRunRef.current >= delay) {
        // 즉시 실행
        callback(...args);
        lastRunRef.current = now;
      } else {
        // 마지막 실행 예약
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        const remainingTime = delay - (now - lastRunRef.current);
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRunRef.current = Date.now();
        }, remainingTime);
      }
    },
    [callback, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const flush = useCallback(
    (...args: T) => {
      cancel();
      callback(...args);
      lastRunRef.current = Date.now();
    },
    [callback, cancel]
  );

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    throttledCallback,
    cancel,
    flush,
  };
};