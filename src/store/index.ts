import { configureStore } from '@reduxjs/toolkit';
import { getEnabledFeatures, debugFeatures } from './feature-registry';

// Feature Registry를 통해 동적으로 reducers와 middlewares 구성
const { reducers, middlewares } = getEnabledFeatures();

// 개발 환경에서 feature 상태 디버깅
debugFeatures();

export const store = configureStore({
  reducer: reducers,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(middlewares),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;