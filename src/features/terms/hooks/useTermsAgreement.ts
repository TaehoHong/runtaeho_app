import { t, useAppLanguage } from '~/i18n';
/**
 * 약관 동의 Hook
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { useTermsStore } from '../stores';
import { termsApiService } from '../services';
import { getSessionSnapshot, isSessionGenerationCurrent } from '~/features/auth/stores/authStore';
import { SessionSupersededError } from '~/utils/storage/errors';
import { useAuth } from '~/features/auth/hooks/useAuth';

export const useTermsAgreement = () => {
  useAppLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { agreements, canProceed, reset: resetTermsStore } = useTermsStore();
  const { completeLogin } = useAuth();

  /**
   * 약관 동의 제출 및 토큰 재발행
   *
   * 약관 동의 API → 토큰 재발행 (isAgreedOnTerms=true) → completeLogin()
   * 라우팅은 AuthProvider가 자동 처리
   */
  const submitAgreement = async (): Promise<void> => {
    // 1. 필수 약관 동의 확인
    if (!canProceed()) {
      Alert.alert(
        t("필수 약관 동의"),
        t("모든 필수 약관에 동의해야 합니다.\n(서비스 이용약관, 개인정보 처리방침, 위치기반서비스 이용약관)")
      );
      return;
    }

    const snapshot = getSessionSnapshot();
    setIsSubmitting(true);

    try {
      console.log('📝 [TERMS_AGREEMENT] 약관 동의 제출 시작');

      // 2. termsData에서 term ID 추출하여 약관 동의 요청 생성
      const termsData = useTermsStore.getState().termsData;

      if (!termsData || !termsData.terms || termsData.terms.length === 0) {
        throw new Error(t("약관 정보를 불러오지 못했습니다."));
      }

      // 3. 약관 동의 API 호출 (DB 업데이트)
      // 모든 약관에 대해 동의 정보 전송
      await termsApiService.agreeToTerms({
        requests: termsData.terms.map(term => {
          // TermType을 AgreementState 키로 매핑
          const agreementKey = term.type === 'SERVICE' ? 'terms'
            : term.type === 'PRIVATE' ? 'privacy'
            : 'location';

          return {
            termId: term.id,
            isAgreed: agreements[agreementKey],
          };
        }),
      });

      console.log('✅ [TERMS_AGREEMENT] 약관 동의 저장 완료');

      // 4. 토큰 재발행 API 호출 (isAgreedOnTerms=true 토큰 발급)
      if (!isSessionGenerationCurrent(snapshot.generation)) throw new SessionSupersededError();
      // Lazy loading avoids the apiClient / refresh coordinator initialization cycle.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { tokenRefreshInterceptor } = require('~/shared/services/TokenRefreshInterceptor') as typeof import('~/shared/services/TokenRefreshInterceptor');
      const tokenResponse = await tokenRefreshInterceptor.refreshAfterConsent();
      if (!isSessionGenerationCurrent(snapshot.generation)) throw new SessionSupersededError();

      console.log('✅ [TERMS_AGREEMENT] 토큰 재발행 완료 (isAgreedOnTerms=true)');

      // 5. 약관 스토어 먼저 초기화 (화면 언마운트 시 에러 방지)
      resetTermsStore();

      // 6. 로그인 완료 처리 (사용자 데이터 조회 + Store/Token 저장)
      await completeLogin(tokenResponse.accessToken, tokenResponse.refreshToken);

      console.log('✅ [TERMS_AGREEMENT] 약관 동의 완료 (AuthProvider가 라우팅 처리)');

    } catch (error: any) {
      if (error instanceof SessionSupersededError || !isSessionGenerationCurrent(snapshot.generation)) return;
      console.error('[Terms] agreement failed', { status: error.response?.status });

      if (error.response?.status === 401) {
        // 토큰 만료
        Alert.alert(
          t("인증 만료"),
          t("인증이 만료되었습니다. 다시 로그인해주세요.")
        );
      } else if (error.response?.status === 400) {
        // 필수 약관 미동의
        Alert.alert(t("오류"), error.response.data.message || t("필수 약관에 모두 동의해야 합니다."));
      } else if (error.response?.status === 409) {
        // 약관 버전 불일치
        Alert.alert(
          t("약관 업데이트"),
          t("약관이 업데이트되었습니다. 새 약관을 확인해주세요."),
          [
            {
              text: t("확인"),
              onPress: async () => {
                // 약관 재로드
                await useTermsStore.getState().fetchTermsContent();
                // 약관 동의 상태 초기화
                useTermsStore.getState().resetAgreements();
              },
            },
          ]
        );
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        // 네트워크 오류
        Alert.alert(
          t("네트워크 오류"),
          t("인터넷 연결을 확인하고 다시 시도해주세요."),
          [
            { text: t("재시도"), onPress: submitAgreement },
            { text: t("취소"), style: 'cancel' },
          ]
        );
      } else {
        // 기타 오류
        Alert.alert(
          t("오류"),
          t("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."),
          [
            { text: t("재시도"), onPress: submitAgreement },
            { text: t("취소"), style: 'cancel' },
          ]
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    canProceed: canProceed(),
    submitAgreement,
  };
};
