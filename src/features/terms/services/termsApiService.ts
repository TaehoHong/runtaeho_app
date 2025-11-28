/**
 * 약관 관련 API 서비스
 */

import { apiClient } from '~/services/api/client';
import type {
  TermsResponse,
  TermsAgreementRequests,
} from '../models/types';
import { API_ENDPOINTS } from '~/services/api';

class TermsApiService {
  /**
   * 현재 약관 내용 조회
   * GET /api/v1/terms
   */
  async getAllTerms(): Promise<TermsResponse> {
    const response = await apiClient.get<TermsResponse>(API_ENDPOINTS.TERMS.ALL);
    return response.data;
  }

  /**
   * 약관 동의 제출
   *
   * @param request 약관 동의 정보
   * @returns 약관 동의 결과
   */
  async agreeToTerms(requests: TermsAgreementRequests): Promise<void> {
    await apiClient.patch(
      API_ENDPOINTS.TERMS.PATCH_AGREEMENT,
      requests
    );
  }
}

export const termsApiService = new TermsApiService();
