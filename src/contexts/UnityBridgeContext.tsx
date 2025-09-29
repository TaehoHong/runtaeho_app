/**
 * Unity Bridge React Context
 * Unity Bridge를 React Native 앱 전체에서 사용할 수 있도록 하는 Context
 */

import { createContext, ReactNode, useCallback, useContext, useEffect, useReducer } from 'react';
import { getUnityService } from '~/shared/di';
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
import {
  UnityCharacterStateEvent,
  UnityAvatarChangeEvent,
  UnityAvatarChangeErrorEvent,
  UnityAnimationCompleteEvent,
  UnityStatusEvent,
  UnityEventListener,
} from '~/types/UnityEventTypes';

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

  // ==========================================
  // 이벤트 핸들러들
  // ==========================================

  const handleCharacterStateChanged = useCallback((event: UnityCharacterStateEvent) => {
    console.log('[UnityBridgeContext] Character state changed:', event);

    const characterState: CharacterState = {
      motion: event.state as CharacterMotion,
      speed: 0, // Unity에서 별도 전송 필요
      isMoving: event.state === 'MOVING',
      timestamp: event.timestamp || new Date().toISOString(),
    };

    dispatch({ type: 'SET_CHARACTER_STATE', payload: characterState });
  }, []);

  const handleAvatarChanged = useCallback((event: UnityAvatarChangeEvent) => {
    console.log('[UnityBridgeContext] Avatar changed:', event);

    try {
      const avatarData = typeof event.avatarData === 'string'
        ? JSON.parse(event.avatarData)
        : event.avatarData;

      if (avatarData?.list) {
        const avatarItems: AvatarItem[] = avatarData.list;
        const newAvatarData: AvatarData = {
          items: avatarItems,
          timestamp: event.timestamp || new Date().toISOString(),
        };
        dispatch({ type: 'SET_AVATAR_DATA', payload: newAvatarData });
      }
    } catch (error) {
      console.error('[UnityBridgeContext] Failed to parse avatar data:', error);
      const errorObj: UnityError = {
        type: 'AVATAR_PARSE_ERROR',
        message: 'Failed to parse avatar data from Unity',
        error: String(error),
      };
      dispatch({ type: 'SET_ERROR', payload: errorObj });
    }
  }, []);

  const handleAvatarChangeError = useCallback((event: UnityAvatarChangeErrorEvent) => {
    console.error('[UnityBridgeContext] Avatar change error:', event);

    const errorObj: UnityError = {
      type: 'AVATAR_CHANGE_ERROR',
      message: event.message || 'Avatar change failed',
      error: 'Avatar change operation failed in Unity',
    };
    dispatch({ type: 'SET_ERROR', payload: errorObj });
  }, []);

  const handleAnimationComplete = useCallback((event: UnityAnimationCompleteEvent) => {
    console.log('[UnityBridgeContext] Animation complete:', event);
  }, []);

  const handleUnityStatus = useCallback((event: UnityStatusEvent) => {
    console.log('[UnityBridgeContext] Unity status:', event);

    const statusData: UnityStatus = {
      characterManagerExists: event.characterManagerExists || false,
      currentSpeed: event.currentSpeed || 0,
      timestamp: event.timestamp || new Date().toISOString(),
    };
    dispatch({ type: 'SET_UNITY_STATUS', payload: statusData });
  }, []);

  const handleUnityError = useCallback((event: any) => {
    console.error('[UnityBridgeContext] Unity error:', event);

    const errorObj: UnityError = {
      type: event.type || 'UNITY_ERROR',
      message: event.message || 'Unity operation failed',
      error: event.error || String(event),
    };
    dispatch({ type: 'SET_ERROR', payload: errorObj });
  }, []);

  const checkInitialConnection = useCallback(async () => {
    try {
      const unityService = getUnityService();
      // Unity 서비스의 연결 상태 확인 로직이 있다면 호출
      dispatch({ type: 'SET_CONNECTED', payload: true });
    } catch (error) {
      console.error('[UnityBridgeContext] Failed to check initial connection:', error);
      dispatch({ type: 'SET_CONNECTED', payload: false });
    }
  }, []);

  // Unity Service 초기화
  useEffect(() => {
    const unityService = getUnityService();

    // 이벤트 리스너 등록 (Unity Service가 이벤트 리스너를 지원한다면)
    // unityService.addEventListener('onCharacterStateChanged', handleCharacterStateChanged);
    // unityService.addEventListener('onAvatarChanged', handleAvatarChanged);
    // unityService.addEventListener('onAvatarChangeError', handleAvatarChangeError);
    // unityService.addEventListener('onAnimationComplete', handleAnimationComplete);
    // unityService.addEventListener('onUnityStatus', handleUnityStatus);
    // unityService.addEventListener('onUnityError', handleUnityError);

    // 초기 연결 상태 확인
    checkInitialConnection();

    return () => {
      // unityService.removeAllEventListeners();
    };
  }, [checkInitialConnection]);


  // ==========================================
  // Unity 제어 메서드들
  // ==========================================

  const setCharacterSpeed = useCallback(async (speed: number): Promise<void> => {
    const unityService = getUnityService();
    if (!unityService) {
      throw new Error('Unity Service not initialized');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // UnityService의 인터페이스에 맞게 수정 필요
      // // await unityService.setCharacterSpeed(speed);
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
    const unityService = getUnityService();
    if (!unityService) {
      throw new Error('Unity Bridge Service not initialized');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // await unityService.stopCharacter();
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
    const unityService = getUnityService();
    if (!unityService) {
      throw new Error('Unity Bridge Service not initialized');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // await unityService.setCharacterMotion(motion);
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
    const unityService = getUnityService();
    if (!unityService) {
      throw new Error('Unity Bridge Service not initialized');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // await unityService.changeAvatar(items);
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
    const unityService = getUnityService();
    if (!unityService) {
      throw new Error('Unity Bridge Service not initialized');
    }

    try {
      // await unityService.getUnityStatus();
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

  // checkInitialConnection은 이미 위에서 정의됨

  const addEventListener = useCallback(<T extends any>(eventName: string, listener: UnityEventListener<T>) => {
    const unityService = getUnityService();
    // UnityService가 이벤트 리스너를 지원한다면 활성화
    // if (unityService) {
    //   unityService.addEventListener(eventName, listener);
    // }
  }, []);

  const removeEventListener = useCallback((eventName: string) => {
    const unityService = getUnityService();
    // UnityService가 이벤트 리스너를 지원한다면 활성화
    // if (unityService) {
    //   unityService.removeEventListener(eventName);
    // }
  }, []);

  const updateConfig = useCallback((newConfig: Partial<UnityBridgeConfig>) => {
    dispatch({ type: 'UPDATE_CONFIG', payload: newConfig });

    const unityService = getUnityService();
    // UnityService가 updateConfig를 지원한다면 활성화
    // if (unityService) {
    //   unityService.updateConfig(newConfig);
    // }
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