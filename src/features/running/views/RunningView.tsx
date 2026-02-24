import React, { useCallback, useEffect, useState, useRef } from 'react';
import { AppState, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { GREY } from '~/shared/styles';
import type { Item } from '~/features/avatar';
import { UnityView } from '~/features/unity/components/UnityView';
import { UnityLoadingState } from '~/features/unity/components/UnityLoadingState';
import { unityService } from '~/features/unity/services/UnityService';
import { LoadingView } from '~/shared/components';
import { usePermissionRequest } from '~/shared/hooks/usePermissionRequest';
import { ViewState, RunningState, useAppStore, useLeagueCheckStore } from '~/stores';
import { useAuthStore } from '~/features';
import { useUserStore } from '~/stores/user/userStore';
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
  const viewState = useAppStore((state) => state.viewState);
  const runningState = useAppStore((state) => state.runningState);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const equippedItems = useUserStore((state) => state.equippedItems);

  // 리그 결과 확인용 상태
  const pendingResult = useLeagueCheckStore((state) => state.pendingResult);
  const clearPendingResult = useLeagueCheckStore((state) => state.clearPendingResult);
  const { checkUncheckedLeagueResult } = useLeagueCheck();

  const { requestPermissionsOnFirstLogin, isPermissionChecked } = usePermissionRequest();

  const [unityStarted, setUnityStarted] = useState(false);
  const [isUnityReady, setIsUnityReady] = useState(false);
  const isInitialMount = useRef(true);
  const hasInitializedAvatar = useRef(false);
  const foregroundReinitUnsubscribeRef = useRef<(() => void) | null>(null);
  const unityReadyInitUnsubscribeRef = useRef<(() => void) | null>(null);

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

    if (isLoggedIn && !unityStarted) {
      console.log('🎮 [RunningView] 로그인 완료 - Unity 시작 예약 (500ms 지연)');

      const timer = setTimeout(() => {
        console.log('🎮 [RunningView] Unity 시작');
        setUnityStarted(true);
      }, 500);

      return () => {
        console.log('🔄 [RunningView] 컴포넌트 언마운트 - Unity 시작 타이머 정리');
        clearTimeout(timer);
      };
    }

    return () => {
      console.log('🔄 [RunningView] 컴포넌트 언마운트');
    };
  }, [isLoggedIn, unityStarted]);

  /**
   * 화면 포커스 시 Unity 캐릭터 동기화 및 리그 결과 재확인
   */
  useFocusEffect(
    useCallback(() => {
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

      const unsubscribe = unityService.onReady(async () => {
        try {
          // ★ getState()로 최신 값 조회 (stale closure 방지)
          const currentState = useUserStore.getState();
          const items = Object.values(currentState.equippedItems).filter((item): item is Item => !!item);
          if (items.length > 0) {
            await unityService.changeAvatar(items, currentState.hairColor);
            console.log(`✅ [RunningView] 포커스 동기화 완료 (${items.length}개)`);
          }
        } catch (error) {
          console.error('❌ [RunningView] 포커스 동기화 실패:', error);
        }
      });

      return () => unsubscribe();
    }, [runningState, checkUncheckedLeagueResult])
  );

  /**
   * 🔑 리그 결과 확인 - Unity 로딩 완료 + 권한 체크 완료 후 실행
   */
  const hasCheckedLeagueRef = useRef(false);
  useEffect(() => {
    // 조건: Unity 준비됨 + 권한 체크 완료 + 러닝 중 아님 + 최초 1회만
    if (!isUnityReady || !isPermissionChecked || runningState !== RunningState.Stopped) {
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
  }, [isUnityReady, isPermissionChecked, runningState, checkUncheckedLeagueResult]);

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
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('🔄 [RunningView] 포그라운드 복귀 - 캐릭터 재초기화');

        // 이전 구독 정리
        if (foregroundReinitUnsubscribeRef.current) {
          foregroundReinitUnsubscribeRef.current();
          foregroundReinitUnsubscribeRef.current = null;
        }

        // onReady는 Push + Pull 패턴으로 안전하게 처리
        foregroundReinitUnsubscribeRef.current = unityService.onReady(async () => {
          try {
            // ★ getState()로 최신 값 조회 (stale closure 방지)
            const currentState = useUserStore.getState();
            const items = Object.values(currentState.equippedItems).filter((item): item is Item => !!item);
            await unityService.initCharacter(items, currentState.hairColor);
            console.log(`✅ [RunningView] 포그라운드 재초기화 완료 (${items.length}개)`);
          } catch (error) {
            console.error('❌ [RunningView] 포그라운드 재초기화 실패:', error);
          }
        });
      }
    });

    return () => {
      subscription.remove();
      if (foregroundReinitUnsubscribeRef.current) {
        foregroundReinitUnsubscribeRef.current();
        foregroundReinitUnsubscribeRef.current = null;
      }
    };
  }, []);

  /**
   * Reactive sync: 첫 로그인 시 데이터가 늦게 도착하는 경우 처리
   * Unity가 ready된 후에 equippedItems가 채워지면 아바타를 동기화
   */
  useEffect(() => {
    // 조건: Unity 준비됨 + 아직 초기화 안됨
    if (!isUnityReady || hasInitializedAvatar.current) {
      return;
    }

    const items = Object.values(equippedItems).filter((item): item is Item => !!item);

    // 아이템이 없으면 대기 (데이터 아직 안 도착)
    if (items.length === 0) {
      console.log('[RunningView] Reactive sync - 아이템 대기 중...');
      return;
    }

    // 초기화 완료 표시 (중복 방지)
    hasInitializedAvatar.current = true;
    console.log('[RunningView] Reactive sync - 아바타 데이터 도착, 동기화 시작');

    const unsubscribe = unityService.onReady(async () => {
      try {
        await unityService.changeAvatar(items);
        console.log(`✅ [RunningView] Reactive sync 완료 (${items.length}개)`);
      } catch (error) {
        console.error('❌ [RunningView] Reactive sync 실패:', error);
      }
    });

    return () => unsubscribe();
  }, [isUnityReady, equippedItems]);

  /**
   * Unity 준비 완료 이벤트 핸들러
   */
  const handleUnityReady = useCallback((event: any) => {
    console.log('[RunningView] Unity View Ready:', event.nativeEvent);

    if (unityReadyInitUnsubscribeRef.current) {
      unityReadyInitUnsubscribeRef.current();
      unityReadyInitUnsubscribeRef.current = null;
    }

    // unityService.onReady는 이미 ready면 즉시 실행하고,
    // 아니면 Native 상태도 확인 후 구독 (이벤트 놓침 방지)
    unityReadyInitUnsubscribeRef.current = unityService.onReady(async () => {
      console.log('[RunningView] ✅ GameObject Ready! 초기화 시작');

      try {
        const currentState = useUserStore.getState();
        const items = Object.values(currentState.equippedItems).filter((item): item is Item => !!item);
        await unityService.initCharacter(items, currentState.hairColor);

        // 아이템이 있었다면 초기화 완료로 표시
        if (items.length > 0) {
          hasInitializedAvatar.current = true;
        }

        console.log(`✅ [RunningView] 초기화 완료 (${items.length}개 아이템)`);
        setIsUnityReady(true);

        // ✅ Unity 로딩 완료 후 권한 요청
        // (권한 팝업이 앱을 inactive 상태로 만들어 Unity 초기화 실패하는 문제 방지)
        console.log('📱 [RunningView] Unity 로딩 완료 → 권한 요청 시작');
        requestPermissionsOnFirstLogin();
      } catch (error) {
        console.error('❌ [RunningView] 초기화 실패:', error);
        // 에러가 발생해도 isUnityReady를 true로 설정하여 UI가 진행되도록 함
        setIsUnityReady(true);

        // ✅ 에러 발생해도 권한 요청 실행 (Unity와 무관하게 권한은 필요)
        console.log('📱 [RunningView] Unity 초기화 실패해도 권한 요청 시작');
        requestPermissionsOnFirstLogin();
      }
    });
  }, [requestPermissionsOnFirstLogin]); // ✅ 의존성 추가

  useEffect(() => {
    return () => {
      if (unityReadyInitUnsubscribeRef.current) {
        unityReadyInitUnsubscribeRef.current();
        unityReadyInitUnsubscribeRef.current = null;
      }
    };
  }, []);

  const isLoading = viewState === ViewState.Loading;

  if (isLoading) {
    console.log('⏳ [RunningView] 로딩 상태');
  } else {
    console.log('✅ [RunningView] Loaded 상태 - Unity + 컴트롤 패널 표시');
  }

  return (
    <RunningProvider isUnityReady={isUnityReady}>
      <View style={styles.container}>
        {unityStarted && (
          <View style={[styles.unityContainer, isLoading && styles.hiddenContainer]}>
            <UnityLoadingState
              isLoading={!isUnityReady}
              variant="running"
              minDisplayTime={500}
            >
              <UnityView
                style={styles.unityView}
                onUnityReady={handleUnityReady}
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
    backgroundColor: GREY[50],
  },
  unityContainer: {
    flex: 0.5, // 화면 상단 50%
    backgroundColor: GREY[100],
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
