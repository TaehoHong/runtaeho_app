import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../index';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1',
  prepareHeaders: async (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.accessToken || await AsyncStorage.getItem('accessToken');

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// Base query with automatic token refresh
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Try to get a new token using refresh token
    const state = api.getState() as RootState;
    const refreshToken = state.auth.refreshToken || await AsyncStorage.getItem('refreshToken');

    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken }
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const { accessToken, refreshToken: newRefreshToken } = refreshResult.data as any;

        // Store new tokens
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', newRefreshToken);

        // Update auth state
        api.dispatch({
          type: 'auth/setTokens',
          payload: { accessToken, refreshToken: newRefreshToken }
        });

        // Retry the original query
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, logout user
        api.dispatch({ type: 'auth/logout' });
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'currentUser']);
      }
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'User', 'Running', 'Avatar', 'Point', 'Shoe', 'Statistic'],
  endpoints: () => ({}),
});