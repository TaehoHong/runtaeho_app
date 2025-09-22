import { configureStore } from '@reduxjs/toolkit';
import { authApi } from './api/authApi';
import { userApi } from './api/userApi';
import { runningApi } from './api/runningApi';
import { avatarApi } from './api/avatarApi';
import { pointApi } from './api/pointApi';
import { shoeApi } from './api/shoeApi';
import { statisticApi } from './api/statisticApi';
import authSlice from './slices/authSlice';
import userSlice from './slices/userSlice';

export const store = configureStore({
  reducer: {
    // API slices
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [runningApi.reducerPath]: runningApi.reducer,
    [avatarApi.reducerPath]: avatarApi.reducer,
    [pointApi.reducerPath]: pointApi.reducer,
    [shoeApi.reducerPath]: shoeApi.reducer,
    [statisticApi.reducerPath]: statisticApi.reducer,

    // Regular slices
    auth: authSlice,
    user: userSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat([
      authApi.middleware,
      userApi.middleware,
      runningApi.middleware,
      avatarApi.middleware,
      pointApi.middleware,
      shoeApi.middleware,
      statisticApi.middleware,
    ]),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;