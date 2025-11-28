/**
 * 약관 동의 Zustand Store
 */

import { create } from 'zustand';
import type {
  TermsResponse,
  TermItem,
  AgreementState,
} from '../models/types';
import { TermType } from '../models/types';
import { termsApiService } from '../services';

interface TermsState {
  // State
  termsData: TermsResponse | null;  // 약관 리스트 데이터
  isLoading: boolean;
  error: string | null;

  // 약관 동의 상태
  agreements: AgreementState;

  // Actions
  fetchTermsContent: () => Promise<void>;
  setAgreement: (type: TermType, value: boolean) => void;
  setAllAgreements: (value: boolean) => void;
  resetAgreements: () => void;
  canProceed: () => boolean;
  reset: () => void;

  // Helper: 특정 타입의 약관 아이템 가져오기
  getTermByType: (type: TermType) => TermItem | undefined;
}

const initialAgreements: AgreementState = {
  terms: false,
  privacy: false,
  location: false,
};

export const useTermsStore = create<TermsState>((set, get) => ({
  // State
  termsData: null,
  isLoading: false,
  error: null,
  agreements: initialAgreements,

  // 약관 내용 조회
  fetchTermsContent: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await termsApiService.getAllTerms();
      set({
        termsData: response,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('❌ [TERMS_STORE] 약관 내용 조회 실패:', error);
      set({
        error: error.message || '약관 내용을 불러오는데 실패했습니다.',
        isLoading: false,
      });
    }
  },

  // 개별 약관 동의 설정
  setAgreement: (type: TermType, value: boolean) => {
    // TermType을 AgreementState 키로 매핑
    const agreementKey = type === TermType.SERVICE ? 'terms'
      : type === TermType.PRIVATE ? 'privacy'
      : 'location';

    set((state) => ({
      agreements: {
        ...state.agreements,
        [agreementKey]: value,
      },
    }));
  },

  // 전체 약관 동의/해제
  setAllAgreements: (value: boolean) => {
    set({
      agreements: {
        terms: value,
        privacy: value,
        location: value,
      },
    });
  },

  // 약관 동의 상태 초기화
  resetAgreements: () => {
    set({ agreements: initialAgreements });
  },

  // 필수 약관 모두 동의 여부 확인
  canProceed: () => {
    const { agreements } = get();
    return agreements.terms && agreements.privacy && agreements.location;
  },

  // 전체 상태 초기화
  reset: () => {
    set({
      termsData: null,
      isLoading: false,
      error: null,
      agreements: initialAgreements,
    });
  },

  // 특정 타입의 약관 아이템 가져오기
  getTermByType: (type: TermType) => {
    const { termsData } = get();
    return termsData?.terms.find(term => term.type === type);
  },
}));
