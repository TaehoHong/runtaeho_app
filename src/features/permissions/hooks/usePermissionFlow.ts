/**
 * usePermissionFlow Hook
 *
 * 권한 플로우 실행을 위한 Hook
 *
 * 사용 예시:
 * ```typescript
 * const { execute, isExecuting, result, reset } = usePermissionFlow();
 *
 * // 로그인 플로우 실행
 * const flowResult = await execute('login');
 *
 * if (flowResult.success) {
 *   console.log('All permissions granted');
 * } else if (flowResult.aborted) {
 *   console.log('Flow aborted:', flowResult.failedStep);
 * }
 * ```
 */

import { useState, useCallback } from 'react';
import { PermissionManager, FlowExecutionResult } from '../services/PermissionManager';

export interface UsePermissionFlowReturn {
  /**
   * 플로우 실행 중 여부
   */
  isExecuting: boolean;

  /**
   * 플로우 실행 결과
   */
  result: FlowExecutionResult | null;

  /**
   * 플로우 성공 여부
   */
  isSuccess: boolean;

  /**
   * 플로우 중단 여부
   */
  isAborted: boolean;

  /**
   * 에러
   */
  error: Error | null;

  /**
   * 플로우 실행
   */
  execute: (flowId: string) => Promise<FlowExecutionResult>;

  /**
   * 상태 초기화
   */
  reset: () => void;
}

/**
 * 권한 플로우 실행 Hook
 */
export function usePermissionFlow(): UsePermissionFlowReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<FlowExecutionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const manager = PermissionManager.getInstance();

  /**
   * 플로우 실행
   */
  const execute = useCallback(
    async (flowId: string): Promise<FlowExecutionResult> => {
      console.log(`[usePermissionFlow] Executing flow: ${flowId}`);

      setIsExecuting(true);
      setError(null);
      setResult(null);

      try {
        const flowResult = await manager.executeFlow(flowId);
        setResult(flowResult);

        console.log(
          `[usePermissionFlow] Flow ${flowId} completed:`,
          flowResult
        );

        return flowResult;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        console.error(`[usePermissionFlow] Flow ${flowId} failed:`, error);
        setError(error);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [manager]
  );

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isExecuting,
    result,
    isSuccess: result?.success ?? false,
    isAborted: result?.aborted ?? false,
    error,
    execute,
    reset,
  };
}
