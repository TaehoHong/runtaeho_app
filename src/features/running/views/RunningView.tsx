import React, { useCallback, useEffect, useState, useRef } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { GREY } from '~/shared/styles';
import type { Item } from '~/features/avatar';
import { UnityView } from '~/features/unity/components/UnityView';
import { unityService } from '~/features/unity/services/UnityService';
import { LoadingView } from '~/shared/components';
import { ViewState, useAppStore } from '~/stores';
import { useAuthStore } from '~/features';
import { useUserStore } from '~/stores/user/userStore';
import { RunningProvider } from '../contexts/RunningContext';
import { RunningDebugView } from './RunningDebugView';
import { ControlPanelView } from './components/ControlPanelView';


/**
 * 메인 러닝 화면
 * 로딩/로드 상태에 따라 UI 분기
 * Unity 컴포넌트 + 상태별 컴트롤 패널
 */
export const RunningView: React.FC = () => {
  const viewState = useAppStore((state) => state.viewState);
  const runningState = useAppStore((state) => state.runningState);
  const setViewState = useAppStore((state) => state.setViewState);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const equippedItems = useUserStore((state) => state.equippedItems);
  const [unityStarted, setUnityStarted] = useState(false);
  const [isUnityReady, setIsUnityReady] = useState(false);
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const isInitialMount = useRef(true);

  console.log('🏃 [RunningView] 렌더링, viewState:', viewState, 'runningState:', runningState, 'isLoggedIn:', isLoggedIn, 'isUnityReady:', isUnityReady);

  useEffect(() => {
    console.log('🔄 [RunningView] 컴포넌트 마운트');

    // 로그인 완료 후에만 Loaded 상태로 전환
    if (isLoggedIn && !unityStarted) {
      console.log('🎮 [RunningView] 로그인 완료 - Loaded 상태로 전환');
      setUnityStarted(true);

      // 다음 프레임에서 Loaded 상태로 전환 (메인 스레드 위반 방지)
      setTimeout(() => {
        setViewState(ViewState.Loaded);
      }, 0);
    } else if (viewState === ViewState.Loading && !isLoggedIn) {
      console.log('🔄 [RunningView] 로그인 대기 중');
    }

    return () => {
      // 컴포넌트 언마운트 시 정리 작업
      console.log('🔄 [RunningView] 컴포넌트 언마운트');
    };
  }, [viewState, isLoggedIn, unityStarted, setViewState]);

  /**
   * 화면 포커스 시 Unity 캐릭터 동기화
   * Tabs 네비게이션에서 다른 화면(아바타 등)에서 돌아올 때 호출됨
   */
  useFocusEffect(
    useCallback(() => {
      // 최초 마운트 시에는 handleUnityReady에서 초기화하므로 스킵
      if (isInitialMount.current) {
        console.log('🔄 [RunningView] 최초 포커스 - 아이템 동기화 스킵 (handleUnityReady에서 처리)');
        isInitialMount.current = false;
        return;
      }

      console.log(`🔄 [RunningView] 화면 포커스 - GameObject Ready 체크: ${unityService.isReady()}, isUnityReady: ${isUnityReady}`);

      // ⚠️ 중요: unityService.isReady()를 먼저 체크!
      // Unity GameObject가 리셋될 수 있으므로 로컬 isUnityReady 상태만으로는 부족함
      if (!unityService.isReady()) {
        console.log('⏳ [RunningView] GameObject not ready - 포커스 동기화 대기');

        // GameObject Ready를 기다린 후 동기화
        unityService.onReady(async () => {
          console.log('✅ [RunningView] GameObject ready! 포커스 동기화 시작');
          try {
            const items = Object.values(equippedItems).filter((item): item is Item => !!item);
            if (items.length > 0) {
              await unityService.changeAvatar(items);
              console.log(`✅ [RunningView] 포커스 아바타 동기화 완료 (${items.length}개 아이템)`);
            }
          } catch (error) {
            console.error('❌ [RunningView] 포커스 아바타 동기화 실패:', error);
          }
        });
        return;
      }

      // GameObject가 이미 준비된 경우 즉시 동기화
      console.log('🔄 [RunningView] 화면 포커스 - 장착 아이템 동기화 시작 (GameObject ready)');

      const syncCharacter = async () => {
        try {
          const items = Object.values(equippedItems).filter((item): item is Item => !!item);

          // 아이템이 있을 때만 아바타 변경
          if (items.length > 0) {
            await unityService.changeAvatar(items);
            console.log(`✅ [RunningView] 포커스 아바타 동기화 완료 (${items.length}개 아이템)`);
          } else {
            console.log('⚠️ [RunningView] 동기화할 아이템 없음');
          }
        } catch (error) {
          console.error('❌ [RunningView] 포커스 아바타 동기화 실패:', error);
        }
      };

      syncCharacter();
    }, [isUnityReady, equippedItems])
  );

  /**
   * 백그라운드 ↔ 포그라운드 전환 감지 및 Unity 재초기화
   * Unity는 백그라운드에서 리셋될 수 있으므로 포그라운드 복귀 시 재초기화 필요
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log(`🔄 [RunningView] 포그라운드 복귀 - GameObject Ready 체크: ${unityService.isReady()}`);

        // ⚠️ 중요: unityService.isReady()를 먼저 체크!
        if (!unityService.isReady()) {
          console.log('⏳ [RunningView] GameObject not ready - 포그라운드 재초기화 대기');

          // GameObject Ready를 기다린 후 재초기화
          unityService.onReady(async () => {
            console.log('✅ [RunningView] GameObject ready! 포그라운드 재초기화 시작');
            try {
              const items = Object.values(equippedItems).filter((item): item is Item => !!item);
              await unityService.initCharacter(items);
              console.log(`✅ [RunningView] 포그라운드 재초기화 완료 (${items.length}개 아이템)`);
            } catch (error) {
              console.error('❌ [RunningView] 포그라운드 재초기화 실패:', error);
            }
          });
          return;
        }

        // GameObject가 이미 준비된 경우 즉시 재초기화
        console.log('🔄 [RunningView] 포그라운드 복귀 - Unity 재초기화 시작 (GameObject ready)');

        const reinitializeCharacter = async () => {
          try {
            const items = Object.values(equippedItems).filter((item): item is Item => !!item);
            await unityService.initCharacter(items);
            console.log(`✅ [RunningView] 포그라운드 재초기화 완료 (${items.length}개 아이템)`);
          } catch (error) {
            console.error('❌ [RunningView] 포그라운드 재초기화 실패:', error);
          }
        };

        reinitializeCharacter();
      }
    });

    return () => subscription.remove();
  }, [equippedItems]);

  /**
   * Unity 준비 완료 이벤트 핸들러
   * GameObject Ready를 기다린 후 최초 초기화만 수행
   */
  const handleUnityReady = useCallback(async (event: any) => {
    console.log('[RunningView] Unity Ready:', event.nativeEvent);

    // GameObject Ready를 항상 기다림 (중요!)
    console.log('[RunningView] GameObject 준비 대기 중...');

    unityService.onReady(async () => {
      console.log('[RunningView] ✅ GameObject Ready! 최초 초기화 시작');

      try {
        const items = Object.values(equippedItems).filter((item): item is Item => !!item);

        // 최초 초기화 (캐릭터 설정 + 정지 상태)
        await unityService.initCharacter(items);

        console.log(`✅ [RunningView] 최초 초기화 완료 (${items.length}개 아이템)`);

        // Unity 준비 완료 플래그 설정
        setIsUnityReady(true);
      } catch (error) {
        console.error('❌ [RunningView] 최초 초기화 실패:', error);
      }
    });
  }, [equippedItems]);

  if (viewState === ViewState.Loading) {
    console.log('⏳ [RunningView] 로딩 화면 표시');
    return (
      <LoadingView 
        onAppear={() => {
          console.log('📎 [RunningView] 로딩 화면 나타나는 중...');
        }}
      />
    );
  }

  console.log('✅ [RunningView] Loaded 상태 - Unity + 컴트롤 패널 표시');

  return (
    <RunningProvider isUnityReady={isUnityReady}>
      <View style={styles.container}>
        {/* Unity 컴포넌트 */}
        <View style={styles.unityContainer}>
          <UnityView
            style={styles.unityView}
            onUnityReady={handleUnityReady}
          />
        </View>

        {/* <View style={styles.verticalGuide}/> */}

        {/* DEBUG 토글 버튼 및 오버레이 (개발 모드에서만) */}
        {__DEV__ && (
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
        )}

        {/* 컴트롤 패널 - Finished 상태일 때는 전체 화면 사용 */}
        <View style={styles.controlPanelContainer}>
          <ControlPanelView />
        </View>

        {/* 알림 들 (iOS alert 대응) */}
        <RunningAlerts />
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
