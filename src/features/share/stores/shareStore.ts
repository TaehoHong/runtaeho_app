/**
 * Share Store
 * 공유 화면에 전달할 러닝 데이터를 일시적으로 보관하는 Zustand store
 *
 * URL params로는 GPS locations 배열을 전달할 수 없어서
 * 네비게이션 전에 store에 저장하고, 화면에서 읽어가는 방식으로 해결
 *
 * 사용 패턴:
 * 1. running-finished.tsx: setShareData() 호출 → router.push()
 * 2. app/share/editor.tsx: useShareStore()로 데이터 읽기
 * 3. 화면 언마운트 시: clearShareData() 호출
 */

import { create } from 'zustand';
import type { ShareRunningData } from '../models/types';

interface ShareStore {
  /** 공유할 러닝 데이터 (GPS 좌표 포함) */
  shareData: ShareRunningData | null;

  /** 공유 데이터 설정 (네비게이션 전 호출) */
  setShareData: (data: ShareRunningData) => void;

  /** 공유 데이터 초기화 (화면 언마운트 시 호출) */
  clearShareData: () => void;
}

export const useShareStore = create<ShareStore>((set) => ({
  shareData: null,

  setShareData: (data) => {
    console.log(
      `📤 [ShareStore] 공유 데이터 저장: distance=${data.distance}m, locations=${data.locations?.length ?? 0}개`
    );
    set({ shareData: data });
  },

  clearShareData: () => {
    console.log('🗑️ [ShareStore] 공유 데이터 초기화');
    set({ shareData: null });
  },
}));
