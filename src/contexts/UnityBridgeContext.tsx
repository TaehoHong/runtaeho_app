/**
 * Unity Bridge React Context
 * Unity Bridge를 React Native 앱 전체에서 사용할 수 있도록 하는 Context
 */

import { createContext, ReactNode, useCallback, useContext, useEffect, useReducer } from 'react';
import { createUnityBridgeService, getUnityBridgeService } from '~/features/unity/bridge/UnityBridgeService';
import {
  AvatarData,
  AvatarItem,
  CharacterMotion,
  CharacterState,
  DEFAULT_UNITY_BRIDGE_STATE,
  UnityBridgeAction,
  UnityBridgeConfig,
  UnityBridgeContextValue,
  UnityBridgeState,
  UnityError,
  UnityStatus,
} from '~/types/UnityTypes';

// ==========================================
// Context 생성
// ==========================================

const UnityBridgeContext = createContext<UnityBridgeContextValue | null>(null);

// ==========================================
// Reducer
// ==========================================

function unityBridgeReducer(state: UnityBridgeState, action: UnityBridgeAction): UnityBridgeState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_CHARACTER_STATE':
      return { ...state, characterState: action.payload };

    case 'SET_AVATAR_DATA':
      return { ...state, currentAvatar: action.payload };

    case 'SET_UNITY_STATUS':
      return { ...state, unityStatus: action.payload };

    case 'UPDATE_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };

    default:
      return state;
  }
}

// ==========================================
// Provider Component
// ==========================================

interface UnityBridgeProviderProps {
  children: ReactNode;
  config?: Partial<UnityBridgeConfig>;
}

export function UnityBridgeProvider({ children, config }: UnityBridgeProviderProps) {
  const [state, dispatch] = useReducer(unityBridgeReducer, {
    ...DEFAULT_UNITY_BRIDGE_STATE,
    config: { ...DEFAULT_UNITY_BRIDGE_STATE.config, ...config },
  });

  // Unity Bridge Service 초기화
  useEffect(() => {
    const bridgeService = createUnityBridgeService(state.config);

    // 이벤트 리스너 등록
    bridgeService.addEventListener('onCharacterStateChanged', handleCharacterStateChanged);
    bridgeService.addEventListener('onAvatarChanged', handleAvatarChanged);
    bridgeService.addEventListener('onAvatarChangeError', handleAvatarChangeError);
    bridgeService.addEventListener('onAnimationComplete', handleAnimationComplete);
    bridgeService.addEventListener('onUnityStatus', handleUnityStatus);
    bridgeService.addEventListener('onUnityError', handleUnityError);

    // 초기 연결 상태 확인
    checkInitialConnection();

    return () => {
      bridgeService.removeAllEventListeners();
    };
  }, []);

  // ==========================================
  // 이벤트 핸들러들
  // ==========================================

  const handleCharacterStateChanged = useCallback((event: any) => {
    console.log('[UnityBridgeContext] Character state changed:', event);

    const characterState: CharacterState = {
      motion: event.state as CharacterMotion,
      speed: 0, // Unity에서 별도 전송 필요
      isMoving: event.state === 'MOVING',
      timestamp: event.timestamp || new Date().toISOString(),
    };

    dispatch({ type: 'SET_CHARACTER_STATE', payload: characterState });
  }, []);

  const handleAvatarChanged = useCallback((event: any) => {
    console.log('[UnityBridgeContext] Avatar changed:', event);

    try {
      const avatarData = typeof event.avatarData === 'string'
        ? JSON.parse(event.avatarData)
        : event.avatarData;

      const processedAvatarData: AvatarData = {
        items: avatarData.list || [],
        timestamp: event.timestamp || new Date().toISOString(),
      };

      dispatch({ type: 'SET_AVATAR_DATA', payload: processedAvatarData });
    } catch (error) {
      console.error('[UnityBridgeContext] Failed to parse avatar data:', error);
      handleUnityError({
        type: 'AVATAR_PARSE_ERROR',
        message: 'Failed to parse avatar change event',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, []);

  const handleAvatarChangeError = useCallback((event: any) => {
    console.error('[UnityBridgeContext] Avatar change error:', event);

    const error: UnityError = {
      type: 'AVATAR_CHANGE_ERROR',
      message: 'Avatar change failed in Unity',
      data: event.errorData,
    };

    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const handleAnimationComplete = useCallback((event: any) => {
    console.log('[UnityBridgeContext] Animation complete:', event);
    // 필요한 경우 애니메이션 완료 상태 처리
  }, []);

  const handleUnityStatus = useCallback((event: any) => {
    console.log('[UnityBridgeContext] Unity status:', event);

    const status: UnityStatus = {
      characterManagerExists: event.characterManagerExists || false,
      currentSpeed: event.currentSpeed || 0,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    dispatch({ type: 'SET_UNITY_STATUS', payload: status });
    dispatch({ type: 'SET_CONNECTED', payload: status.characterManagerExists });
  }, []);

  const handleUnityError = useCallback((error: UnityError) => {
    console.error('[UnityBridgeContext] Unity error:', error);
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  // ==========================================
  // Unity 제어 메서드들
  // ==========================================

  const setCharacterSpeed = useCallback(async (speed: number): Promise<void> => {
    const bridgeService = getUnityBridgeService();
    if (!bridgeService) {
      throw new Error('Unity Bridge Service not initialized');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await bridgeService.setCharacterSpeed(speed);
    } catch (error) {
      const unityError: UnityError = {
        type: 'SET_SPEED_ERROR',
        message: 'Failed to set character speed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      dispatch({ type: 'SET_ERROR', payload: unityError });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const stopCharacter = useCallback(async (): Promise<void> => {
    const bridgeService = getUnityBridgeService();
    if (!bridgeService) {
      throw new Error('Unity Bridge Service not initialized');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await bridgeService.stopCharacter();
    } catch (error) {
      const unityError: UnityError = {
        type: 'STOP_CHARACTER_ERROR',
        message: 'Failed to stop character',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      dispatch({ type: 'SET_ERROR', payload: unityError });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const setCharacterMotion = useCallback(async (motion: CharacterMotion): Promise<void> => {
    const bridgeService = getUnityBridgeService();
    if (!bridgeService) {
      throw new Error('Unity Bridge Service not initialized');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await bridgeService.setCharacterMotion(motion);
    } catch (error) {
      const unityError: UnityError = {
        type: 'SET_MOTION_ERROR',
        message: 'Failed to set character motion',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      dispatch({ type: 'SET_ERROR', payload: unityError });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const changeAvatar = useCallback(async (items: AvatarItem[]): Promise<void> => {
    const bridgeService = getUnityBridgeService();
    if (!bridgeService) {
      throw new Error('Unity Bridge Service not initialized');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await bridgeService.changeAvatar(items);
    } catch (error) {
      const unityError: UnityError = {
        type: 'CHANGE_AVATAR_ERROR',
        message: 'Failed to change avatar',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      dispatch({ type: 'SET_ERROR', payload: unityError });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const getUnityStatus = useCallback(async (): Promise<void> => {
    const bridgeService = getUnityBridgeService();
    if (!bridgeService) {
      throw new Error('Unity Bridge Service not initialized');
    }

    try {
      await bridgeService.getUnityStatus();
    } catch (error) {
      const unityError: UnityError = {
        type: 'GET_STATUS_ERROR',
        message: 'Failed to get Unity status',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      dispatch({ type: 'SET_ERROR', payload: unityError });
      throw error;
    }
  }, []);

  // ==========================================
  // 유틸리티 메서드들
  // ==========================================

  const checkInitialConnection = useCallback(async () => {
    try {
      await getUnityStatus();
    } catch (error) {
      console.warn('[UnityBridgeContext] Initial connection check failed:', error);
    }
  }, [getUnityStatus]);

  const addEventListener = useCallback((eventName: string, listener: any) => {
    const bridgeService = getUnityBridgeService();
    if (bridgeService) {
      bridgeService.addEventListener(eventName, listener);
    }
  }, []);

  const removeEventListener = useCallback((eventName: string) => {
    const bridgeService = getUnityBridgeService();
    if (bridgeService) {
      bridgeService.removeEventListener(eventName);
    }
  }, []);

  const updateConfig = useCallback((newConfig: Partial<UnityBridgeConfig>) => {
    dispatch({ type: 'UPDATE_CONFIG', payload: newConfig });

    const bridgeService = getUnityBridgeService();
    if (bridgeService) {
      bridgeService.updateConfig(newConfig);
    }
  }, []);

  // ==========================================
  // Context Value
  // ==========================================

  const contextValue: UnityBridgeContextValue = {
    // State
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    characterState: state.characterState,
    currentAvatar: state.currentAvatar,
    unityStatus: state.unityStatus,
    config: state.config,

    // Methods
    setCharacterSpeed,
    stopCharacter,
    setCharacterMotion,
    changeAvatar,
    getUnityStatus,
    addEventListener,
    removeEventListener,
    updateConfig,
  };

  return (
    <UnityBridgeContext.Provider value={contextValue}>
      {children}
    </UnityBridgeContext.Provider>
  );
}

// ==========================================
// Hook
// ==========================================

export function useUnityBridge(): UnityBridgeContextValue {
  const context = useContext(UnityBridgeContext);

  if (!context) {
    throw new Error('useUnityBridge must be used within a UnityBridgeProvider');
  }

  return context;
}

export default UnityBridgeContext;