import React, { useCallback, useEffect, useState, useRef } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { GREY } from '~/shared/styles';
import type { Item } from '~/features/avatar';
import { UnityView } from '~/features/unity/components/UnityView';
import { unityService } from '~/features/unity/services/UnityService';
import { LoadingView } from '~/shared/components';
import { ViewState, RunningState, useAppStore, useLeagueCheckStore } from '~/stores';
import { useAuthStore } from '~/features';
import { useUserStore } from '~/stores/user/userStore';
import { useLeagueCheck } from '~/features/league/hooks/useLeagueCheck';
import { RunningProvider } from '../contexts/RunningContext';
import { RunningDebugView } from './RunningDebugView';
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
  // ✅ setViewState 제거 - AuthProvider에서 단일 관리 (Race Condition 방지)
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const equippedItems = useUserStore((state) => state.equippedItems);
  const hairColor = useUserStore((state) => state.hairColor);

  // 리그 결과 확인용 상태
  const pendingResult = useLeagueCheckStore((state) => state.pendingResult);
  const clearPendingResult = useLeagueCheckStore((state) => state.clearPendingResult);
  const { checkUncheckedLeagueResult } = useLeagueCheck();

  const [unityStarted, setUnityStarted] = useState(false);
  const [isUnityReady, setIsUnityReady] = useState(false);
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const isInitialMount = useRef(true);
  const hasInitializedAvatar = useRef(false);

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

    // ✅ Unity 시작 상태만 관리 (viewState 변경은 AuthProvider에서 담당)
    if (isLoggedIn && !unityStarted) {
      console.log('🎮 [RunningView] 로그인 완료 - Unity 시작 예약 (500ms 지연)');

      // ✅ Cold Start 크래시 방지: Unity 엔진 초기화 시간 확보
      // 앱 스위처에서 강제 종료 후 재실행 시 React Native UI와 Unity 엔진 간 Race Condition 방지
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
   * Tabs 네비게이션에서 다른 화면(아바타 등)에서 돌아올 때 호출됨
   */
  useFocusEffect(
    useCallback(() => {
      // 최초 마운트 시에도 리그 결과 확인
      if (isInitialMount.current) {
        console.log('🔄 [RunningView] 최초 포커스 - 리그 결과 확인');
        isInitialMount.current = false;

        // 최초 마운트 시 리그 결과 확인 (러닝 중이 아닐 때만)
        if (runningState === RunningState.Stopped) {
          useLeagueCheckStore.getState().allowRecheck();
          checkUncheckedLeagueResult();
        }
        return;
      }

      // 러닝 중이면 리그 결과 재확인 스킵
      if (runningState !== RunningState.Stopped) {
        console.log('🔄 [RunningView] 러닝 중 - 리그 결과 재확인 스킵');
      } else {
        console.log('🔄 [RunningView] 화면 포커스 - 리그 결과 재확인');
        useLeagueCheckStore.getState().allowRecheck();
        checkUncheckedLeagueResult();
      }

      // 아바타 동기화
      console.log('🔄 [RunningView] 화면 포커스 - 아바타 동기화');

      const unsubscribe = unityService.onReady(async () => {
        try {
          const items = Object.values(equippedItems).filter((item): item is Item => !!item);
          if (items.length > 0) {
            await unityService.changeAvatar(items, hairColor);
            console.log(`✅ [RunningView] 포커스 동기화 완료 (${items.length}개)`);
          }
        } catch (error) {
          console.error('❌ [RunningView] 포커스 동기화 실패:', error);
        }
      });

      return () => unsubscribe();
    }, [equippedItems, runningState, checkUncheckedLeagueResult])
  );

  /**
   * 백그라운드 ↔ 포그라운드 전환 감지 및 Unity 재초기화
   * Unity는 백그라운드에서 리셋될 수 있으므로 포그라운드 복귀 시 재초기화 필요
   */
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('🔄 [RunningView] 포그라운드 복귀 - 캐릭터 재초기화');

        // 이전 구독 정리
        if (unsubscribe) {
          unsubscribe();
        }

        // onReady는 Push + Pull 패턴으로 안전하게 처리
        unsubscribe = unityService.onReady(async () => {
          try {
            const currentEquippedItems = useUserStore.getState().equippedItems;
            const items = Object.values(currentEquippedItems).filter((item): item is Item => !!item);
            await unityService.initCharacter(items, hairColor);
            console.log(`✅ [RunningView] 포그라운드 재초기화 완료 (${items.length}개)`);
          } catch (error) {
            console.error('❌ [RunningView] 포그라운드 재초기화 실패:', error);
          }
        });
      }
    });

    return () => {
      subscription.remove();
      if (unsubscribe) {
        unsubscribe();
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
   * Push + Pull 패턴으로 Race Condition 없이 안정적으로 초기화
   * CRITICAL FIX: getState()를 사용하여 stale closure 문제 해결
   */
  const handleUnityReady = useCallback((event: any) => {
    console.log('[RunningView] Unity View Ready:', event.nativeEvent);

    // unityService.onReady는 이미 ready면 즉시 실행하고,
    // 아니면 Native 상태도 확인 후 구독 (이벤트 놓침 방지)
    const unsubscribe = unityService.onReady(async () => {
      console.log('[RunningView] ✅ GameObject Ready! 초기화 시작');

      try {
        // CRITICAL FIX: 클로저 대신 스토어에서 직접 읽기 (stale closure 방지)
        const currentEquippedItems = useUserStore.getState().equippedItems;
        const items = Object.values(currentEquippedItems).filter((item): item is Item => !!item);
        await unityService.initCharacter(items, hairColor);

        // 아이템이 있었다면 초기화 완료로 표시
        if (items.length > 0) {
          hasInitializedAvatar.current = true;
        }

        console.log(`✅ [RunningView] 초기화 완료 (${items.length}개 아이템)`);
        setIsUnityReady(true);
      } catch (error) {
        console.error('❌ [RunningView] 초기화 실패:', error);
        // 에러가 발생해도 isUnityReady를 true로 설정하여 UI가 진행되도록 함
        setIsUnityReady(true);
      }
    });

    // 컴포넌트 리렌더링 시 이전 구독 정리를 위해 반환
    // (useCallback이므로 실제로 정리되지 않지만, 향후 useEffect로 전환 시 활용 가능)
    return unsubscribe;
  }, []); // 의존성 제거 - getState() 사용으로 항상 최신 값 참조

  const isLoading = viewState === ViewState.Loading;

  if (isLoading) {
    console.log('⏳ [RunningView] 로딩 상태');
  } else {
    console.log('✅ [RunningView] Loaded 상태 - Unity + 컴트롤 패널 표시');
  }

  // ✅ v9: Unity Cold Start 크래시 방지
  // - 500ms 지연: React Native UI 안정화 후 Unity 컴포넌트 마운트
  // - Native 측 동기적 초기화: Metal context 준비 후에만 view 표시
  // - presentsWithTransaction = true: GPU 렌더링과 CATransaction 동기화
  return (
    <RunningProvider isUnityReady={isUnityReady}>
      <View style={styles.container}>
        {/* ✅ v9: Unity 컴포넌트 - unityStarted 후에만 마운트 */}
        {unityStarted && (
          <View style={[styles.unityContainer, isLoading && styles.hiddenContainer]}>
            <UnityView
              style={styles.unityView}
              onUnityReady={handleUnityReady}
            />
          </View>
        )}

        {/* <View style={styles.verticalGuide}/> */}

        {/* DEBUG 토글 버튼 및 오버레이 (개발 모드에서만) */}
        {/* {__DEV__ && (
          <>
            <TouchableOpacity
              style={styles.debugToggleButton}
              onPress={() => setIsDebugVisible(!isDebugVisible)}
            >
              <Text style={styles.debugToggleText}>
                {isDebugVisible ? '📋 닫기' : '🐛 디버그'}
              </Text>
            </TouchableOpacity>

            {isDebugVisible && (
              <View style={styles.debugOverlay}>
                <View style={styles.debugContent}>
                  <RunningDebugView />
                </View>
              </View>
            )}
          </>
        )} */}

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
 * iOS RunningView의 alert 들 대응
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
  debugToggleButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10000,
    borderWidth: 1,
    borderColor: '#00ff00',
  },
  debugToggleText: {
    color: '#00ff00',
    fontSize: 14,
    fontWeight: 'bold',
  },
  debugOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 9998,
    padding: 16,
  },
  debugContent: {
    flex: 1,
    marginTop: 100,
  },
  verticalGuide: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: 'red',
    opacity: 0.3,
    zIndex: 9999,
  }
});
