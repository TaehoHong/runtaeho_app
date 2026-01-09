/**
 * League Check Store (Zustand)
 * 리그 결과 확인 상태를 전역으로 관리
 *
 * 용도:
 * - 앱 시작/로그인 시 미확인 리그 결과 체크 상태 관리
 * - Race Condition 방지 (중복 체크 방지)
 * - AuthProvider에서 단일 진입점으로 사용
 */

import { create } from 'zustand';
import type { LeagueResult } from '~/features/league/models';

/**
 * 리그 결과 확인 상태
 */
type LeagueCheckStatus = 'idle' | 'checking' | 'checked';

/**
 * League Check State Interface
 */
interface LeagueCheckState {
  // State
  checkStatus: LeagueCheckStatus;
  pendingResult: LeagueResult | null;

  // Actions
  startCheck: () => boolean;
  setChecked: (result: LeagueResult | null) => void;
  clearPendingResult: () => void;
  reset: () => void;
}

/**
 * Initial State
 */
const initialState = {
  checkStatus: 'idle' as LeagueCheckStatus,
  pendingResult: null as LeagueResult | null,
};

/**
 * League Check Store
 *
 * 사용 예시:
 * ```typescript
 * const { checkStatus, pendingResult, startCheck, setChecked } = useLeagueCheckStore();
 *
 * // 체크 시작 (이미 체크 중이면 false 반환)
 * if (startCheck()) {
 *   const result = await leagueService.getUncheckedResult();
 *   setChecked(result);
 * }
 * ```
 */
export const useLeagueCheckStore = create<LeagueCheckState>((set, get) => ({
  // Initial State
  ...initialState,

  // Actions

  /**
   * 체크 시작
   * 이미 체크 중이거나 완료된 경우 false 반환
   * Race Condition 방지용
   */
  startCheck: () => {
    const current = get().checkStatus;
    if (current !== 'idle') {
      console.log(`🏆 [LeagueCheckStore] startCheck 스킵 (현재 상태: ${current})`);
      return false;
    }
    console.log('🏆 [LeagueCheckStore] startCheck → checking');
    set({ checkStatus: 'checking' });
    return true;
  },

  /**
   * 체크 완료 및 결과 설정
   */
  setChecked: (result) => {
    console.log('🏆 [LeagueCheckStore] setChecked:', result ? result.resultStatus : 'null');
    set({
      checkStatus: 'checked',
      pendingResult: result,
    });
  },

  /**
   * 보류 중인 결과 클리어
   * 결과 화면으로 이동 후 호출
   */
  clearPendingResult: () => {
    console.log('🏆 [LeagueCheckStore] clearPendingResult');
    set({ pendingResult: null });
  },

  /**
   * 상태 초기화
   * 로그아웃 시 호출
   */
  reset: () => {
    console.log('🏆 [LeagueCheckStore] reset');
    set(initialState);
  },
}));
