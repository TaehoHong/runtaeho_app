import { createSlice } from '@reduxjs/toolkit';

/**
 * User State (Auth와 분리된 일반 사용자 상태)
 * Swift UserStateManager에서 비인증 관련 부분 마이그레이션 예정
 */
interface UserState {
  // TODO: Swift User 기능 마이그레이션 후 구현
  appLaunchCount: number;
  lastAppVersion: string | null;
}

const initialState: UserState = {
  appLaunchCount: 0,
  lastAppVersion: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // TODO: Swift User 기능 마이그레이션 후 구현
    incrementAppLaunchCount: (state) => {
      state.appLaunchCount += 1;
    },
    setLastAppVersion: (state, action) => {
      state.lastAppVersion = action.payload;
    },
  },
});

export const { incrementAppLaunchCount, setLastAppVersion } = userSlice.actions;
export default userSlice.reducer;