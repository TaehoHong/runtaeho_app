import { apiClient } from '~/services/api/client';
import { API_ENDPOINTS } from '~/services/api/config';
import type { UpdateUserConfiguration, UserConfiguration } from '../models/UserConfiguration';

export const userConfigurationService = {
  get: async (signal?: AbortSignal): Promise<UserConfiguration> => {
    const { data } = await apiClient.get<UserConfiguration>(API_ENDPOINTS.USER.CONFIGURATION, signal ? { signal } : {});
    return data;
  },
  update: async (request: UpdateUserConfiguration, signal?: AbortSignal): Promise<UserConfiguration> => {
    const { data } = await apiClient.patch<UserConfiguration>(
      API_ENDPOINTS.USER.CONFIGURATION, request, signal ? { signal } : {}
    );
    return data;
  },
};
