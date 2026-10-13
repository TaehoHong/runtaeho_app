import type { SessionSnapshot } from '~/features/auth/stores/authStore';
import { apiClient } from '~/services/api/client';
import { API_ENDPOINTS } from '~/services/api/config';
import type { UpdateUserConfiguration, UserConfiguration } from '../models/UserConfiguration';

export const userConfigurationService = {
  get: async (signal?: AbortSignal, sessionSnapshot?: SessionSnapshot): Promise<UserConfiguration> => {
    const { data } = await apiClient.get<UserConfiguration>(API_ENDPOINTS.USER.CONFIGURATION, { ...(signal ? { signal } : {}), ...(sessionSnapshot ? { sessionSnapshot } : {}) });
    return data;
  },
  update: async (request: UpdateUserConfiguration, signal?: AbortSignal, sessionSnapshot?: SessionSnapshot): Promise<UserConfiguration> => {
    const { data } = await apiClient.patch<UserConfiguration>(
      API_ENDPOINTS.USER.CONFIGURATION, request, { ...(signal ? { signal } : {}), ...(sessionSnapshot ? { sessionSnapshot } : {}) }
    );
    return data;
  },
};
