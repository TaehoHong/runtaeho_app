/**
 * League React Query Hooks
 * 리그 관련 데이터 페칭 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../services/queryClient';
import type { CurrentLeague, LeagueResult } from '../models';
import { leagueService } from './leagueService';

/**
 * 현재 리그 정보 조회 훅
 */
export const useGetCurrentLeague = (options?: { enabled?: boolean }) => {
  return useQuery<CurrentLeague | null>({
    queryKey: queryKeys.league.current,
    queryFn: () => leagueService.getCurrentLeague(),
    enabled: options?.enabled ?? true,
  });
};

/**
 * 미확인 리그 결과 조회 훅
 */
export const useGetUncheckedResult = (options?: { enabled?: boolean }) => {
  return useQuery<LeagueResult | null>({
    queryKey: queryKeys.league.result,
    queryFn: () => leagueService.getUncheckedResult(),
    enabled: options?.enabled ?? true,
    staleTime: 0, // 항상 fresh하게 조회
  });
};

/**
 * 리그 참가 뮤테이션 훅
 */
export const useJoinLeague = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => leagueService.joinLeague(),
    onSuccess: () => {
      // 리그 참가 성공 시 현재 리그 정보 리프레시
      queryClient.invalidateQueries({ queryKey: queryKeys.league.all });
    },
  });
};

/**
 * 리그 결과 확인 완료 뮤테이션 훅
 */
export const useConfirmResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => leagueService.confirmResult(),
    onSuccess: () => {
      // 캐시를 즉시 null로 설정 (Race Condition 방지)
      queryClient.setQueryData(queryKeys.league.result, null);
      // 현재 리그 정보 리프레시
      queryClient.invalidateQueries({ queryKey: queryKeys.league.current });
    },
  });
};
