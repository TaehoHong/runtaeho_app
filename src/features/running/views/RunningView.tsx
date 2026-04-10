import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { GREY } from '~/shared/styles';
import type { Item } from '~/features/avatar';
import { UnityLoadingState } from '~/features/unity/components/UnityLoadingState';
import { useUnityBootstrap } from '~/features/unity/hooks';
import { unityService } from '~/features/unity/services/UnityService';
import { LoadingView } from '~/shared/components';
import { usePermissionRequest } from '~/shared/hooks/usePermissionRequest';
import { ViewState, RunningState, useAppStore, useLeagueCheckStore } from '~/stores';
import { useAuthStore } from '~/features';
import { useUserStore } from '~/stores/user/userStore';
import { useUnityStore } from '~/stores/unity/unityStore';
import { useLeagueCheck } from '~/features/league/hooks/useLeagueCheck';
import { RunningProvider } from '../contexts/RunningContext';
import { ControlPanelView } from './components/ControlPanelView';


/**
 * 메인 러닝 화면
 * 로딩/로드 상태에 따라 UI 분기
 * Unity 컴포넌트 + 상태별 컴트롤 패널
 */
export const RunningView: React.FC = () => {
  const router = useRouter();
  const isRunningActive = useIsFocused();
  const viewState = useAppStore((state) => state.viewState);
  const runningState = useAppStore((state) => state.runningState);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const currentUser = useUserStore((state) => state.currentUser);
  const equippedItems = useUserStore((state) => state.equippedItems);
  const hairColor = useUserStore((state) => state.hairColor);

  // 리그 결과 확인용 상태
  const pendingResult = useLeagueCheckStore((state) => state.pendingResult);
  const clearPendingResult = useLeagueCheckStore((state) => state.clearPendingResult);
  const { checkUncheckedLeagueResult } = useLeagueCheck();

  const { requestPermissionsOnFirstLogin, isPermissionChecked } = usePermissionRequest();

  const isInitialMount = useRef(true);
  const hasRequestedPermissionRef = useRef(false);
  const hasInitializedCharacterRef = useRef(false);
  const focusSyncInFlightRef = useRef(false);
  const unityViewportRef = useRef<View>(null);
  const setActiveViewport = useUnityStore((state) => state.setActiveViewport);
  const clearActiveViewport = useUnityStore((state) => state.clearActiveViewport);
  const isUnitySurfaceVisible = useUnityStore((state) => state.isSurfaceVisible);

  const getInitialAvatarPayload = useCallback(() => {
    if (!currentUser) {
      return null;
    }

    const items = Object.values(equippedItems).filter(
      (item): item is Item => !!item
    );

    return {
      items,
      hairColor,
    };
  }, [currentUser, equippedItems, hairColor]);

  const {
    isReady: isUnityReady,
    isUnityStarted: unityStarted,
    isInitialAvatarSynced,
    startUnity,
  } = useUnityBootstrap({
    waitForAvatar: false,
    timeout: 5000,
    startDelay: 500,
    autoStart: false,
    getInitialAvatarPayload,
  });

  const isLoading = viewState === ViewState.Loading;
  const isUnitySectionLoading = !isUnityReady || !isInitialAvatarSynced || !isUnitySurfaceVisible;

  console.log('🏃 [RunningView] 렌더링, viewState:', viewState, 'runningState:', runningState, 'isLoggedIn:', isLoggedIn, 'isUnityReady:', isUnityReady);

  /**
   * 리그 결과 확인 - pendingResult가 있으면 결과 화면으로 이동
   *
   * 정책:
   * - 러닝탭 진입 시 결과 확인 화면 표시 → 확인 후 러닝탭으로 복귀
   * - 러닝 중이면 결과 화면 표시 안 함 (러닝 중단 방지)
   */
  useEffect(() => {
    // 러닝 중이면 결과 화면 표시 안 함
    if (runningState !== RunningState.Stopped) {
      return;
    }

    if (pendingResult) {
      console.log('🏆 [RunningView] 미확인 리그 결과 있음 → 결과 화면으로 이동');
      router.push({
        pathname: '/league/result' as const,
        params: { resultData: JSON.stringify(pendingResult) },
      } as any);
      clearPendingResult();
    }
  }, [pendingResult, runningState, router, clearPendingResult]);

  useEffect(() => {
    console.log('🔄 [RunningView] 컴포넌트 마운트');

    if (isLoggedIn && isRunningActive) {
      console.log('🎮 [RunningView] 로그인 완료 - Unity 시작');
      startUnity();
    }

    return () => {
      console.log('🔄 [RunningView] 컴포넌트 언마운트');
    };
  }, [isLoggedIn, isRunningActive, startUnity]);

  /**
   * 화면 포커스 시 Unity 캐릭터 동기화 및 리그 결과 재확인
   */
  useFocusEffect(
    useCallback(() => {
      if (!isRunningActive) {
        return;
      }

      if (!isInitialAvatarSynced) {
        return;
      }

      // 최초 마운트 시에는 아바타 동기화만 (리그 결과 확인은 별도 useEffect에서)
      if (isInitialMount.current) {
        console.log('🔄 [RunningView] 최초 포커스 - 리그 결과 확인은 Unity 로딩 완료 후 실행');
        isInitialMount.current = false;
        return;
      }

      // 러닝 중이면 리그 결과 재확인 스킵
      if (runningState !== RunningState.Stopped) {
        console.log('🔄 [RunningView] 러닝 중 - 리그 결과 재확인 스킵');
      } else {
        // 탭 전환 시에만 리그 결과 재확인 (최초 마운트는 별도 useEffect에서 처리)
        console.log('🔄 [RunningView] 화면 포커스 (탭 전환) - 리그 결과 재확인');
        useLeagueCheckStore.getState().allowRecheck();
        checkUncheckedLeagueResult();
      }

      // 아바타 동기화
      console.log('🔄 [RunningView] 화면 포커스 - 아바타 동기화');
      if (focusSyncInFlightRef.current) {
        return;
      }

      focusSyncInFlightRef.current = true;
      void unityService
        .runWhenReady(async () => {
          try {
            const currentState = useUserStore.getState();
            const items = Object.values(currentState.equippedItems).filter(
              (item): item is Item => !!item
            );
            const syncResult = await unityService.syncAvatar(items, currentState.hairColor, {
              waitForReady: false,
            });
            console.log(
              `✅ [RunningView] 포커스 동기화 완료 (${items.length}개, result=${syncResult})`
            );
          } catch (error) {
            console.error('❌ [RunningView] 포커스 동기화 실패:', error);
          }
        }, { waitForAvatar: false, timeoutMs: 3000, forceReadyOnTimeout: true })
        .finally(() => {
          focusSyncInFlightRef.current = false;
        });
    }, [isInitialAvatarSynced, isRunningActive, runningState, checkUncheckedLeagueResult])
  );

  /**
   * 🔑 리그 결과 확인 - Unity 로딩 완료 + 권한 체크 완료 후 실행
   */
  const hasCheckedLeagueRef = useRef(false);
  useEffect(() => {
    // 조건: Unity 준비됨 + 권한 체크 완료 + 러닝 중 아님 + 최초 1회만
    if (
      !isRunningActive
      || !isUnityReady
      || !isInitialAvatarSynced
      || !isPermissionChecked
      || runningState !== RunningState.Stopped
    ) {
      return;
    }

    if (hasCheckedLeagueRef.current) {
      return;
    }
    hasCheckedLeagueRef.current = true;

    // 리그 결과 확인 (맨 마지막)
    console.log('🏆 [RunningView] Unity + 권한 준비 완료 → 리그 결과 확인');
    useLeagueCheckStore.getState().allowRecheck();
    checkUncheckedLeagueResult();
  }, [
    isInitialAvatarSynced,
    isRunningActive,
    isUnityReady,
    isPermissionChecked,
    runningState,
    checkUncheckedLeagueResult,
  ]);

  /**
   * Android 시스템 뒤로가기 차단
   * 러닝 중(Running/Paused)에는 화면 이탈을 방지하기 위해 백 버튼을 소비
   */
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const shouldBlockBack =
        runningState === RunningState.Running || runningState === RunningState.Paused;

      if (shouldBlockBack) {
        console.log('🛑 [RunningView] 러닝 중 시스템 뒤로가기 차단');
        return true;
      }

      return false;
    });

    return () => {
      backHandler.remove();
    };
  }, [runningState]);

  /**
   * 백그라운드 ↔ 포그라운드 전환 감지 및 Unity 재초기화
   * Unity는 백그라운드에서 리셋될 수 있으므로 포그라운드 복귀 시 재초기화 필요
   */
  useEffect(() => {
    if (!isRunningActive) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('🔄 [RunningView] 포그라운드 복귀 - 캐릭터 재초기화');
        void unityService.runWhenReady(async () => {
          try {
            const currentState = useUserStore.getState();
            const currentRunningState = useAppStore.getState().runningState;
            const items = Object.values(currentState.equippedItems).filter(
              (item): item is Item => !!item
            );

            if (currentRunningState === RunningState.Running) {
              const syncResult = await unityService.syncAvatar(items, currentState.hairColor, {
                waitForReady: false,
              });
              console.log(
                `✅ [RunningView] 포그라운드 재동기화 완료 (${items.length}개, result=${syncResult})`
              );
              return;
            }

            await unityService.initCharacter(items, currentState.hairColor);
            console.log(`✅ [RunningView] 포그라운드 재초기화 완료 (${items.length}개)`);
          } catch (error) {
            console.error('❌ [RunningView] 포그라운드 재초기화 실패:', error);
          }
        }, { waitForAvatar: false, timeoutMs: 3000, forceReadyOnTimeout: true });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isRunningActive]);

  useEffect(() => {
    if (
      !isRunningActive
      || !isUnityReady
      || !isInitialAvatarSynced
      || hasInitializedCharacterRef.current
    ) {
      return;
    }

    hasInitializedCharacterRef.current = true;
    console.log('[RunningView] ✅ GameObject Ready! 초기화 시작');

    void unityService.runWhenReady(async () => {
      try {
        if (runningState === RunningState.Running) {
          console.log('✅ [RunningView] 초기화 완료 (러닝 중 상태 유지)');
        } else {
          await unityService.stopCharacter();
          console.log('✅ [RunningView] 초기화 완료 (캐릭터 정지 상태 적용)');
        }
      } catch (error) {
        console.error('❌ [RunningView] 초기화 실패:', error);
      } finally {
        if (!hasRequestedPermissionRef.current) {
          hasRequestedPermissionRef.current = true;
          console.log('📱 [RunningView] Unity 로딩 완료 → 권한 요청 시작');
          requestPermissionsOnFirstLogin();
        }
      }
    }, { waitForAvatar: false, timeoutMs: 3000, forceReadyOnTimeout: true });
  }, [
    isInitialAvatarSynced,
    isRunningActive,
    isUnityReady,
    requestPermissionsOnFirstLogin,
    runningState,
  ]);

  useEffect(() => {
    if (!isRunningActive || !isUnityReady || !isInitialAvatarSynced) {
      hasInitializedCharacterRef.current = false;
    }
  }, [isInitialAvatarSynced, isRunningActive, isUnityReady]);

  const syncUnityViewport = useCallback(() => {
    if (!isRunningActive || !unityStarted || !unityViewportRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      unityViewportRef.current?.measureInWindow((x, y, width, height) => {
        if (!isRunningActive || !unityStarted || width <= 0 || height <= 0) {
          return;
        }

        setActiveViewport({
          owner: 'running',
          frame: { x, y, width, height },
          borderRadius: 0,
        });
      });
    });
  }, [isRunningActive, setActiveViewport, unityStarted]);

  useFocusEffect(
    useCallback(() => {
      if (unityStarted) {
        syncUnityViewport();
      }

      return () => {
        clearActiveViewport('running');
      };
    }, [clearActiveViewport, syncUnityViewport, unityStarted])
  );

  useEffect(() => {
    if (!isRunningActive || !unityStarted) {
      return;
    }

    syncUnityViewport();
  }, [isLoading, isRunningActive, syncUnityViewport, unityStarted]);

  if (isLoading) {
    console.log('⏳ [RunningView] 로딩 상태');
  } else {
    console.log('✅ [RunningView] Loaded 상태 - Unity + 컴트롤 패널 표시');
  }

  return (
    <RunningProvider isUnityReady={isRunningActive ? isUnityReady : false}>
      <View style={styles.container} testID="running-root">
        {unityStarted && isRunningActive && (
          <View style={[styles.unityContainer, isLoading && styles.hiddenContainer]}>
            <UnityLoadingState
              isLoading={isUnitySectionLoading}
              variant="running"
              minDisplayTime={500}
            >
              <View
                ref={unityViewportRef}
                style={styles.unityView}
                onLayout={syncUnityViewport}
                collapsable={false}
              />
            </UnityLoadingState>
          </View>
        )}

        {/* 컴트롤 패널 - Loading 상태일 때는 숨김 */}
        <View style={[styles.controlPanelContainer, isLoading && styles.hiddenContainer]}>
          <ControlPanelView />
        </View>

        {/* 알림 들 (iOS alert 대응) */}
        <RunningAlerts />

        {/* Loading 오버레이 - Unity가 백그라운드에서 초기화되는 동안 표시 */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <LoadingView
              onAppear={() => {
                console.log('📎 [RunningView] 로딩 화면 나타나는 중...');
              }}
            />
          </View>
        )}
      </View>
    </RunningProvider>
  );
};

/**
 * 러닝 관련 알림들
 */
const RunningAlerts: React.FC = () => {
  // TODO: 이전 러닝 데이터 복구 알림
  // TODO: 위치 권한 필요 알림

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  unityContainer: {
    flex: 0.5, // 화면 상단 50%
    backgroundColor: 'transparent',
  },
  unityView: {
    flex: 1,
    width: '100%',
  },
  controlPanelContainer: {
    flex: 0.5, // 화면 하단 50%
    backgroundColor: GREY[50],
    borderTopColor: '#ddd',
  },
  // Loading 상태에서 Unity 컴포넌트 숨김 (opacity 기반)
  hiddenContainer: {
    opacity: 0,
    pointerEvents: 'none',
  },
  // Loading 오버레이 - 전체 화면 덮기
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
});
