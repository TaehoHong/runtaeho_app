/**
 * 리그 결과 확인 Hook
 *
 * AuthProvider에서 분리된 단일 책임 Hook
 * - 앱 시작 시 미확인 리그 결과 체크
 * - 로그인 후 리그 결과 확인
 * - Race Condition 방지 (startCheck 가드)
 */

import { useCallback } from 'react';
import { useLeagueCheckStore } from '../../../stores';
import { leagueService } from '../services/leagueService';
      
/**
 * 리그 결과 확인 Hook
 *
 * @example
 * ```tsx
 * const { checkUncheckedLeagueResult, checkStatus } = useLeagueCheck();
 *
 * // 앱 시작 시 또는 로그인 후 호출
 * await checkUncheckedLeagueResult();
 * ```
 */
export const useLeagueCheck = () => {
  const checkStatus = useLeagueCheckStore((state) => state.checkStatus);
  const startCheck = useLeagueCheckStore((state) => state.startCheck);
  const setChecked = useLeagueCheckStore((state) => state.setChecked);

  /**
   * 미확인 리그 결과 확인
   *
   * 앱 첫 진입 시 리그 결과가 있으면 결과 화면으로 바로 이동하기 위해
   * 미리 확인하여 상태에 저장해둠
   *
   * Race Condition 방지: 시작 작업이 없으면 이미 확인 중이므로 스킵
   */
  const checkUncheckedLeagueResult = useCallback(async () => {
    // 이미 확인 중이거나 완료된 경우 스킵 (Race Condition 방지)
    const operation = startCheck();
    if (!operation) {
      console.log('🏆 [useLeagueCheck] 리그 결과 확인 스킵 (이미 진행 중)');
      return;
    }

    try {
      console.log('🏆 [useLeagueCheck] 미확인 리그 결과 확인 중...');

      const uncheckedResult = await leagueService.getUncheckedResult(operation);

      if (uncheckedResult) {
        console.log('🏆 [useLeagueCheck] 미확인 리그 결과 발견:', uncheckedResult.resultStatus);
      } else {
        console.log('🏆 [useLeagueCheck] 미확인 리그 결과 없음');
      }

      setChecked(uncheckedResult, operation);
    } catch (error) {
      console.log('⚠️ [useLeagueCheck] 리그 결과 확인 실패 (무시):', error);
      // 리그 미참가 또는 네트워크 오류 시 무시하고 계속 진행
      setChecked(null, operation);
    }
  }, [startCheck, setChecked]);

  /**
   * 리그 결과 확인 스킵 (로그인하지 않은 상태용)
   */
  const skipLeagueCheck = useCallback(() => {
    const operation = startCheck();
    if (operation) setChecked(null, operation);
  }, [startCheck, setChecked]);

  return {
    checkUncheckedLeagueResult,
    skipLeagueCheck,
    checkStatus,
  };
};
