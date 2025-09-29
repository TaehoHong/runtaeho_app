/**
 * Unity Bridge Middleware
 * Unity 이벤트를 Redux와 API와 연동하기 위한 미들웨어
 */

import { Middleware } from '@reduxjs/toolkit';
import { getUnityBridgeService } from '~/features/unity/bridge/UnityBridgeService';
import {
  setConnected,
  setError,
  updateAvatarData,
  updateCharacterState,
  updateUnityStatus,
} from '~/store/slices/unitySlice';

// Unity 이벤트를 Redux action으로 변환하는 매핑
const unityEventToAction = {
  onCharacterStateChanged: (event: any) => updateCharacterState({
    motion: event.state,
    speed: 0, // 별도로 업데이트 필요
    isMoving: event.state === 'MOVING',
    timestamp: event.timestamp || new Date().toISOString(),
  }),

  onAvatarChanged: (event: any) => {
    try {
      const avatarData = typeof event.avatarData === 'string'
        ? JSON.parse(event.avatarData)
        : event.avatarData;

      return updateAvatarData({
        items: avatarData.list || [],
        timestamp: event.timestamp || new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to parse avatar data:', error);
      return setError({
        type: 'AVATAR_PARSE_ERROR',
        message: 'Failed to parse avatar change event',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  onUnityStatus: (event: any) => updateUnityStatus({
    // 기본 상태
    isInitialized: event.isInitialized || true,
    isVisible: event.isVisible || true,
    isLoading: event.isLoading || false,
    currentScene: event.currentScene || 'MainScene',
    currentAnimation: event.currentAnimation || null,

    // 성능 정보
    performance: {
      fps: event.performance?.fps || 60,
      memoryUsage: event.performance?.memoryUsage || 0,
      renderTime: event.performance?.renderTime || 0,
    },

    // 캐릭터 매니저 관련
    characterManagerExists: event.characterManagerExists || false,
    currentSpeed: event.currentSpeed || 0,
    timestamp: event.timestamp || new Date().toISOString(),
  }),

  onUnityError: (event: any) => setError({
    type: event.type || 'UNITY_ERROR',
    message: event.message || 'Unity error occurred',
    error: event.error,
  }),
};

/**
 * Unity Bridge Redux Middleware
 * Unity 이벤트를 Redux store와 자동으로 동기화
 */
export const unityMiddleware: Middleware = (store) => {
  let isInitialized = false;

  const initializeUnityListeners = () => {
    if (isInitialized) return;

    const bridgeService = getUnityBridgeService();
    if (!bridgeService) {
      console.warn('[Unity Middleware] Unity Bridge Service not available');
      return;
    }

    // Unity 이벤트 리스너 등록
    Object.entries(unityEventToAction).forEach(([eventName, actionCreator]) => {
      bridgeService.addEventListener(eventName, (event: any) => {
        try {
          const action = actionCreator(event);
          if (action) {
            store.dispatch(action);
          }
        } catch (error) {
          console.error(`[Unity Middleware] Failed to handle ${eventName}:`, error);
          store.dispatch(setError({
            type: 'MIDDLEWARE_ERROR',
            message: `Failed to handle Unity event: ${eventName}`,
            error: error instanceof Error ? error.message : 'Unknown error',
          }));
        }
      });
    });

    // 연결 상태 모니터링
    const checkConnectionPeriodically = () => {
      bridgeService.checkConnection()
        .then(isConnected => {
          const currentState = store.getState() as any;
          if (currentState.unity?.isConnected !== isConnected) {
            store.dispatch(setConnected(isConnected));
          }
        })
        .catch(error => {
          console.warn('[Unity Middleware] Connection check failed:', error);
          store.dispatch(setConnected(false));
        });
    };

    // 5초마다 연결 상태 확인
    setInterval(checkConnectionPeriodically, 5000);

    isInitialized = true;
    console.log('[Unity Middleware] Unity event listeners initialized');
  };

  return (next) => (action) => {
    // Unity Bridge 초기화 (첫 번째 action에서 실행)
    if (!isInitialized) {
      initializeUnityListeners();
    }

    // Action 처리
    const result = next(action);

    // 특정 Redux action에 대해 Unity Bridge API 호출
    handleReduxToUnitySync(action, store);

    return result;
  };
};

/**
 * Redux action을 Unity Bridge API 호출로 변환
 */
const handleReduxToUnitySync = (action: any, store: any) => {
  const bridgeService = getUnityBridgeService();
  if (!bridgeService) return;

  // API 호출과 Unity 상태 동기화가 필요한 경우 여기에 구현
  switch (action.type) {
    case 'running/updateRunningProgress':
      // 러닝 진행 상황이 업데이트되면 Unity 캐릭터도 업데이트
      syncRunningWithUnity(action.payload, bridgeService);
      break;

    case 'avatar/updateUserAvatar':
      // 사용자 아바타가 변경되면 Unity 캐릭터도 업데이트
      syncAvatarWithUnity(action.payload, bridgeService);
      break;

    default:
      // 다른 action은 무시
      break;
  }
};

/**
 * 러닝 데이터를 Unity와 동기화
 */
const syncRunningWithUnity = async (runningData: any, bridgeService: any) => {
  try {
    if (runningData.isRunning) {
      // 러닝 중이면 속도에 따라 캐릭터 움직임
      const speed = runningData.speed || 5;
      await bridgeService.setCharacterSpeed(speed);
      await bridgeService.setCharacterMotion('MOVE');
    } else if (runningData.isPaused) {
      // 일시정지면 정지
      await bridgeService.setCharacterMotion('IDLE');
    } else {
      // 완전 정지
      await bridgeService.stopCharacter();
    }
  } catch (error) {
    console.error('[Unity Middleware] Failed to sync running data:', error);
  }
};

/**
 * 아바타 데이터를 Unity와 동기화
 */
const syncAvatarWithUnity = async (avatarData: any, bridgeService: any) => {
  try {
    // avatarData를 Unity AvatarItem 형식으로 변환
    const avatarItems = convertToUnityAvatarItems(avatarData);
    if (avatarItems.length > 0) {
      await bridgeService.changeAvatar(avatarItems);
    }
  } catch (error) {
    console.error('[Unity Middleware] Failed to sync avatar data:', error);
  }
};

/**
 * API 아바타 데이터를 Unity AvatarItem 형식으로 변환
 */
const convertToUnityAvatarItems = (avatarData: any): any[] => {
  const items: any[] = [];

  // API 응답 구조에 따라 변환 로직 구현
  if (avatarData.hair) {
    items.push({
      name: avatarData.hair.name,
      part: 'Hair',
      itemPath: avatarData.hair.unityFilePath || `Assets/05.Resource/Hair/${avatarData.hair.name}`,
    });
  }

  if (avatarData.clothing) {
    items.push({
      name: avatarData.clothing.name,
      part: 'Cloth',
      itemPath: avatarData.clothing.unityFilePath || `Assets/05.Resource/Cloth/${avatarData.clothing.name}`,
    });
  }

  if (avatarData.pants) {
    items.push({
      name: avatarData.pants.name,
      part: 'Pant',
      itemPath: avatarData.pants.unityFilePath || `Assets/05.Resource/Pant/${avatarData.pants.name}`,
    });
  }

  if (avatarData.shoes) {
    items.push({
      name: avatarData.shoes.name,
      part: 'Shoes',
      itemPath: avatarData.shoes.unityFilePath || `Assets/05.Resource/Shoes/${avatarData.shoes.name}`,
    });
  }

  return items;
};

export default unityMiddleware;