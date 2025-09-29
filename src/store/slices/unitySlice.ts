/**
 * Unity Bridge Redux Slice
 * Unity 상태를 Redux로 관리하기 위한 slice
 */

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getUnityBridgeService } from '~/features/unity/bridge/UnityBridgeService';
import type {
  AvatarData,
  AvatarItem,
  CharacterMotion,
  CharacterState,
  UnityBridgeConfig,
  UnityError,
  UnityStatus,
} from '~/features/unity/types/UnityTypes';

// ==========================================
// State 인터페이스
// ==========================================

export interface UnityState {
  // Connection Status
  isConnected: boolean;
  isLoading: boolean;
  error: UnityError | null;

  // Character State
  characterState: CharacterState | null;

  // Avatar State
  currentAvatar: AvatarData | null;

  // Unity Status
  unityStatus: UnityStatus | null;

  // Configuration
  config: UnityBridgeConfig;

  // UI State
  isUnityViewVisible: boolean;
  lastInteraction: string | null;
}

// ==========================================
// Initial State
// ==========================================

const initialState: UnityState = {
  isConnected: false,
  isLoading: false,
  error: null,
  characterState: {
    motion: 'IDLE',
    speed: 0,
    isMoving: false,
    timestamp: new Date().toISOString(),
  },
  currentAvatar: null,
  unityStatus: null,
  config: {
    enableDebugLogs: __DEV__,
    autoConnect: true,
    reconnectAttempts: 3,
    eventBufferSize: 50,
  },
  isUnityViewVisible: false,
  lastInteraction: null,
};

// ==========================================
// Async Thunks
// ==========================================

/**
 * 캐릭터 속도 설정
 */
export const setCharacterSpeed = createAsyncThunk(
  'unity/setCharacterSpeed',
  async (speed: number, { rejectWithValue }) => {
    try {
      const bridgeService = getUnityBridgeService();
      if (!bridgeService) {
        throw new Error('Unity Bridge Service not initialized');
      }

      await bridgeService.setCharacterSpeed(speed);
      return { speed, timestamp: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue({
        type: 'SET_SPEED_ERROR',
        message: 'Failed to set character speed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 캐릭터 정지
 */
export const stopCharacter = createAsyncThunk(
  'unity/stopCharacter',
  async (_, { rejectWithValue }) => {
    try {
      const bridgeService = getUnityBridgeService();
      if (!bridgeService) {
        throw new Error('Unity Bridge Service not initialized');
      }

      await bridgeService.stopCharacter();
      return { timestamp: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue({
        type: 'STOP_CHARACTER_ERROR',
        message: 'Failed to stop character',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 캐릭터 모션 설정
 */
export const setCharacterMotion = createAsyncThunk(
  'unity/setCharacterMotion',
  async (motion: CharacterMotion, { rejectWithValue }) => {
    try {
      const bridgeService = getUnityBridgeService();
      if (!bridgeService) {
        throw new Error('Unity Bridge Service not initialized');
      }

      await bridgeService.setCharacterMotion(motion);
      return { motion, timestamp: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue({
        type: 'SET_MOTION_ERROR',
        message: 'Failed to set character motion',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 아바타 변경
 */
export const changeAvatar = createAsyncThunk(
  'unity/changeAvatar',
  async (items: AvatarItem[], { rejectWithValue }) => {
    try {
      const bridgeService = getUnityBridgeService();
      if (!bridgeService) {
        throw new Error('Unity Bridge Service not initialized');
      }

      await bridgeService.changeAvatar(items);
      return { items, timestamp: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue({
        type: 'CHANGE_AVATAR_ERROR',
        message: 'Failed to change avatar',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Unity 상태 정보 요청
 */
export const getUnityStatus = createAsyncThunk(
  'unity/getUnityStatus',
  async (_, { rejectWithValue }) => {
    try {
      const bridgeService = getUnityBridgeService();
      if (!bridgeService) {
        throw new Error('Unity Bridge Service not initialized');
      }

      await bridgeService.getUnityStatus();
      return { timestamp: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue({
        type: 'GET_STATUS_ERROR',
        message: 'Failed to get Unity status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Unity 연결 확인
 */
export const checkUnityConnection = createAsyncThunk(
  'unity/checkConnection',
  async (_, { rejectWithValue }) => {
    try {
      const bridgeService = getUnityBridgeService();
      if (!bridgeService) {
        throw new Error('Unity Bridge Service not initialized');
      }

      const isConnected = await bridgeService.checkConnection();
      return { isConnected, timestamp: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue({
        type: 'CONNECTION_CHECK_ERROR',
        message: 'Failed to check Unity connection',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ==========================================
// Slice 정의
// ==========================================

const unitySlice = createSlice({
  name: 'unity',
  initialState,
  reducers: {
    // 연결 상태 설정
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
      state.lastInteraction = new Date().toISOString();
    },

    // 에러 설정
    setError: (state, action: PayloadAction<UnityError | null>) => {
      state.error = action.payload;
      state.lastInteraction = new Date().toISOString();
    },

    // 에러 클리어
    clearError: (state) => {
      state.error = null;
    },

    // 캐릭터 상태 업데이트
    updateCharacterState: (state, action: PayloadAction<CharacterState>) => {
      state.characterState = action.payload;
      state.lastInteraction = new Date().toISOString();
    },

    // 아바타 데이터 업데이트
    updateAvatarData: (state, action: PayloadAction<AvatarData>) => {
      state.currentAvatar = action.payload;
      state.lastInteraction = new Date().toISOString();
    },

    // Unity 상태 업데이트
    updateUnityStatus: (state, action: PayloadAction<UnityStatus>) => {
      state.unityStatus = action.payload;
      state.isConnected = action.payload.characterManagerExists;
      state.lastInteraction = new Date().toISOString();
    },

    // Unity View 표시/숨김
    setUnityViewVisible: (state, action: PayloadAction<boolean>) => {
      state.isUnityViewVisible = action.payload;
      state.lastInteraction = new Date().toISOString();
    },

    // 설정 업데이트
    updateConfig: (state, action: PayloadAction<Partial<UnityBridgeConfig>>) => {
      state.config = { ...state.config, ...action.payload };
      state.lastInteraction = new Date().toISOString();
    },

    // 전체 상태 리셋
    resetUnityState: (state) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    // setCharacterSpeed
    builder
      .addCase(setCharacterSpeed.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setCharacterSpeed.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.characterState) {
          state.characterState.speed = action.payload.speed;
          state.characterState.timestamp = action.payload.timestamp;
        }
        state.lastInteraction = action.payload.timestamp;
      })
      .addCase(setCharacterSpeed.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as UnityError;
      });

    // stopCharacter
    builder
      .addCase(stopCharacter.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(stopCharacter.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.characterState) {
          state.characterState.speed = 0;
          state.characterState.isMoving = false;
          state.characterState.motion = 'IDLE';
          state.characterState.timestamp = action.payload.timestamp;
        }
        state.lastInteraction = action.payload.timestamp;
      })
      .addCase(stopCharacter.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as UnityError;
      });

    // setCharacterMotion
    builder
      .addCase(setCharacterMotion.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setCharacterMotion.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.characterState) {
          state.characterState.motion = action.payload.motion;
          state.characterState.isMoving = action.payload.motion === 'MOVE';
          state.characterState.timestamp = action.payload.timestamp;
        }
        state.lastInteraction = action.payload.timestamp;
      })
      .addCase(setCharacterMotion.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as UnityError;
      });

    // changeAvatar
    builder
      .addCase(changeAvatar.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changeAvatar.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentAvatar = {
          items: action.payload.items,
          timestamp: action.payload.timestamp,
        };
        state.lastInteraction = action.payload.timestamp;
      })
      .addCase(changeAvatar.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as UnityError;
      });

    // getUnityStatus
    builder
      .addCase(getUnityStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUnityStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastInteraction = action.payload.timestamp;
      })
      .addCase(getUnityStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as UnityError;
      });

    // checkUnityConnection
    builder
      .addCase(checkUnityConnection.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkUnityConnection.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isConnected = action.payload.isConnected;
        state.lastInteraction = action.payload.timestamp;
      })
      .addCase(checkUnityConnection.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as UnityError;
      });
  },
});

// ==========================================
// Actions Export
// ==========================================

export const {
  setConnected,
  setError,
  clearError,
  updateCharacterState,
  updateAvatarData,
  updateUnityStatus,
  setUnityViewVisible,
  updateConfig,
  resetUnityState,
} = unitySlice.actions;

// ==========================================
// Selectors
// ==========================================

export const selectUnityState = (state: { unity: UnityState }) => state.unity;
export const selectIsUnityConnected = (state: { unity: UnityState }) => state.unity.isConnected;
export const selectUnityLoading = (state: { unity: UnityState }) => state.unity.isLoading;
export const selectUnityError = (state: { unity: UnityState }) => state.unity.error;
export const selectCharacterState = (state: { unity: UnityState }) => state.unity.characterState;
export const selectCurrentAvatar = (state: { unity: UnityState }) => state.unity.currentAvatar;
export const selectUnityStatus = (state: { unity: UnityState }) => state.unity.unityStatus;
export const selectUnityConfig = (state: { unity: UnityState }) => state.unity.config;
export const selectIsUnityViewVisible = (state: { unity: UnityState }) => state.unity.isUnityViewVisible;

// ==========================================
// Reducer Export
// ==========================================

export default unitySlice.reducer;