/**
 * Unity 캐릭터 관련 Context
 * UnityBridgeContext에서 캐릭터 관련 기능만 분리
 */

import React, { createContext, useContext, useCallback, useReducer } from 'react';
import { CharacterState, CharacterMotion, UnityError } from '../types/UnityTypes';

// ==========================================
// Types
// ==========================================

interface UnityCharacterState {
  characterState: CharacterState | null;
  isMoving: boolean;
  currentSpeed: number;
  currentMotion: CharacterMotion;
  error: UnityError | null;
}

interface UnityCharacterContextValue extends UnityCharacterState {
  setCharacterSpeed: (speed: number) => Promise<void>;
  stopCharacter: () => Promise<void>;
  setCharacterMotion: (motion: CharacterMotion) => Promise<void>;
  resetCharacterState: () => void;
}

// ==========================================
// Initial State
// ==========================================

const initialState: UnityCharacterState = {
  characterState: null,
  isMoving: false,
  currentSpeed: 0,
  currentMotion: 'IDLE',
  error: null,
};

// ==========================================
// Reducer
// ==========================================

type UnityCharacterAction =
  | { type: 'SET_CHARACTER_STATE'; payload: CharacterState }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'SET_MOTION'; payload: CharacterMotion }
  | { type: 'SET_MOVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: UnityError | null }
  | { type: 'RESET_STATE' };

const unityCharacterReducer = (state: UnityCharacterState, action: UnityCharacterAction): UnityCharacterState => {
  switch (action.type) {
    case 'SET_CHARACTER_STATE':
      return {
        ...state,
        characterState: action.payload,
        currentSpeed: action.payload.speed,
        currentMotion: action.payload.motion,
        isMoving: action.payload.isMoving,
      };
    case 'SET_SPEED':
      return { ...state, currentSpeed: action.payload };
    case 'SET_MOTION':
      return { ...state, currentMotion: action.payload };
    case 'SET_MOVING':
      return { ...state, isMoving: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
};

// ==========================================
// Context
// ==========================================

const UnityCharacterContext = createContext<UnityCharacterContextValue | undefined>(undefined);

export const useUnityCharacter = (): UnityCharacterContextValue => {
  const context = useContext(UnityCharacterContext);
  if (!context) {
    throw new Error('useUnityCharacter must be used within UnityCharacterProvider');
  }
  return context;
};

// ==========================================
// Provider
// ==========================================

interface UnityCharacterProviderProps {
  children: React.ReactNode;
}

export const UnityCharacterProvider: React.FC<UnityCharacterProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(unityCharacterReducer, initialState);

  // ==========================================
  // Character Control Methods
  // ==========================================

  const setCharacterSpeed = useCallback(async (speed: number): Promise<void> => {
    try {
      dispatch({ type: 'SET_SPEED', payload: speed });
      // TODO: Unity 통신 로직 구현
      console.log(`[UnityCharacter] Setting character speed to: ${speed}`);
    } catch (error) {
      const unityError: UnityError = {
        type: 'CHARACTER_CONTROL_ERROR',
        message: `Failed to set character speed: ${error}`,
        timestamp: Date.now(),
      };
      dispatch({ type: 'SET_ERROR', payload: unityError });
      throw unityError;
    }
  }, []);

  const stopCharacter = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_SPEED', payload: 0 });
      dispatch({ type: 'SET_MOVING', payload: false });
      dispatch({ type: 'SET_MOTION', payload: 'IDLE' });
      // TODO: Unity 통신 로직 구현
      console.log('[UnityCharacter] Stopping character');
    } catch (error) {
      const unityError: UnityError = {
        type: 'CHARACTER_CONTROL_ERROR',
        message: `Failed to stop character: ${error}`,
        timestamp: Date.now(),
      };
      dispatch({ type: 'SET_ERROR', payload: unityError });
      throw unityError;
    }
  }, []);

  const setCharacterMotion = useCallback(async (motion: CharacterMotion): Promise<void> => {
    try {
      dispatch({ type: 'SET_MOTION', payload: motion });
      dispatch({ type: 'SET_MOVING', payload: motion === 'MOVE' });
      // TODO: Unity 통신 로직 구현
      console.log(`[UnityCharacter] Setting character motion to: ${motion}`);
    } catch (error) {
      const unityError: UnityError = {
        type: 'CHARACTER_CONTROL_ERROR',
        message: `Failed to set character motion: ${error}`,
        timestamp: Date.now(),
      };
      dispatch({ type: 'SET_ERROR', payload: unityError });
      throw unityError;
    }
  }, []);

  const resetCharacterState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  // ==========================================
  // Context Value
  // ==========================================

  const contextValue: UnityCharacterContextValue = {
    ...state,
    setCharacterSpeed,
    stopCharacter,
    setCharacterMotion,
    resetCharacterState,
  };

  return (
    <UnityCharacterContext.Provider value={contextValue}>
      {children}
    </UnityCharacterContext.Provider>
  );
};