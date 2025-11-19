import { useEffect } from 'react';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { reportError } from '~/config/sentry';

/**
 * React Query 에러를 Sentry에 자동으로 리포팅하는 Hook
 *
 * @example
 * ```tsx
 * const query = useQuery({ ... });
 * useQueryErrorHandler(query, 'fetch-user-data');
 * ```
 */
export function useQueryErrorHandler(
  result: UseQueryResult | UseMutationResult,
  context?: string
) {
  useEffect(() => {
    if (result.error) {
      reportError(result.error as Error, {
        type: 'react-query',
        context,
        timestamp: Date.now(),
      });
    }
  }, [result.error, context]);
}
