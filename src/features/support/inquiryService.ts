import { apiClient } from '~/services/api/client';
import { API_ENDPOINTS } from '~/services/api/config';
import type { InquiryRequest, InquiryResponse } from './types';

export const inquiryService = {
  submit: async (request: InquiryRequest): Promise<InquiryResponse> => {
    const { data } = await apiClient.post<InquiryResponse>(API_ENDPOINTS.INQUIRY.BASE, request);
    return data;
  },
};
