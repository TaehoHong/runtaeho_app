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
import { getSessionSnapshot, isSessionCurrent, type SessionSnapshot } from '~/features/auth/stores/authStore';

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
  checkOperation: SessionSnapshot | null;

  // Actions
  startCheck: () => SessionSnapshot | null;
  setChecked: (result: LeagueResult | null, operation: SessionSnapshot) => void;
  consumePendingResult: () => LeagueResult | null;
  reset: () => void;
  allowRecheck: () => void;
}

/**
 * Initial State
 */
const initialState = {
  checkStatus: 'idle' as LeagueCheckStatus,
  pendingResult: null as LeagueResult | null,
  checkOperation: null as SessionSnapshot | null,
};

/**
 * League Check Store
 *
 * 사용 예시:
 * ```typescript
 * const { checkStatus, pendingResult, startCheck, setChecked } = useLeagueCheckStore();
 *
 * const operation = startCheck();
 * if (operation) {
 *   const result = await leagueService.getUncheckedResult(operation);
 *   setChecked(result, operation);
 * }
 * ```
 */
export const useLeagueCheckStore = create<LeagueCheckState>((set, get) => ({
  // Initial State
  ...initialState,

  // Actions

  /**
   * 체크 시작
   * 이미 체크 중이거나 완료된 경우 null 반환
   * Race Condition 방지용
   */
  startCheck: () => {
    const { checkStatus: current, checkOperation } = get();
    if (current !== 'idle' && (!checkOperation || isSessionCurrent(checkOperation))) {
      console.log(`🏆 [LeagueCheckStore] startCheck 스킵 (현재 상태: ${current})`);
      return null;
    }
    console.log('🏆 [LeagueCheckStore] startCheck → checking');
    const operation = getSessionSnapshot();
    set({ checkStatus: 'checking', checkOperation: operation, pendingResult: null });
    return operation;
  },

  /**
   * 체크 완료 및 결과 설정
   */
  setChecked: (result, operation) => {
    if (get().checkOperation !== operation || get().checkStatus !== 'checking' || !isSessionCurrent(operation)) return;
    console.log('🏆 [LeagueCheckStore] setChecked:', result ? result.resultStatus : 'null');
    set({
      checkStatus: 'checked',
      pendingResult: result,
    });
  },

  /**
   * 현재 세션의 결과를 이동 전에 원자적으로 가져와 중복 소비 방지
   */
  consumePendingResult: () => {
    const { pendingResult, checkOperation } = get();
    if (!pendingResult || !checkOperation || !isSessionCurrent(checkOperation)) return null;
    set({ pendingResult: null });
    return pendingResult;
  },

  /**
   * 상태 초기화
   * 로그아웃 시 호출
   */
  reset: () => {
    console.log('🏆 [LeagueCheckStore] reset');
    set(initialState);
  },

  /**
   * 재확인 허용
   * 탭 이동 시 호출 - pendingResult가 없고 checked 상태면 idle로 리셋
   */
  allowRecheck: () => {
    const { pendingResult, checkStatus } = get();
    if (!pendingResult && checkStatus === 'checked') {
      console.log('🏆 [LeagueCheckStore] allowRecheck → idle');
      set({ checkStatus: 'idle' });
    }
  },
}));
