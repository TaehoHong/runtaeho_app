import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { UnityView } from '~/features/unity/components/UnityView';
import { unityService } from '~/features/unity/services/UnityService';
import { LoadingView } from '~/shared/components';
import { ViewState, useAppStore, useAuthStore } from '~/stores';
import { ControlPanelView } from './ControlPanelView';
import { RunningProvider } from '../contexts/RunningContext';
import { RunningDebugView } from './RunningDebugView';


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
  const [unityStarted, setUnityStarted] = useState(false);
  const [isDebugVisible, setIsDebugVisible] = useState(false);

  console.log('🏃 [RunningView] 렌더링, viewState:', viewState, 'runningState:', runningState, 'isLoggedIn:', isLoggedIn);

  useEffect(() => {
    console.log('🔄 [RunningView] 컴포넌트 마운트');

    // 로그인 완료 후에만 Unity 시작
    if (isLoggedIn && !unityStarted) {
      console.log('🎮 [RunningView] 로그인 완료 - Unity 시작 및 Loaded 상태로 전환');
      setUnityStarted(true);

      // Unity 시작 로직 (iOS unity.start() 대응)
      startUnity();

      // 다음 프레임에서 Loaded 상태로 전환 (메인 스레드 위반 방지)
      setTimeout(() => {
        setViewState(ViewState.Loaded);
      }, 0);
    } else if (viewState === ViewState.Loading && !isLoggedIn) {
      console.log('🔄 [RunningView] 로그인 대기 중 - Unity 시작 보류');
    }

    return () => {
      // 컴포넌트 언마운트 시 정리 작업
      console.log('🔄 [RunningView] 컴포넌트 언마운트');
    };
  }, [viewState, isLoggedIn, unityStarted, setViewState]);

  /**
   * Unity 시작
   * iOS unity.start() 대응
   */
  const startUnity = async () => {
    try {
      console.log('🎮 [RunningView] Unity 시작 시도');

      // Unity 캐릭터 초기 설정
      await unityService.setCharacterSpeed(0);

      console.log('✅ [RunningView] Unity 시작 성공');
    } catch (error) {
      console.error('❌ [RunningView] Unity 시작 실패:', error);
    }
  };

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
    <RunningProvider>
      <View style={styles.container}>
        {/* Unity 컴포넌트 */}
        <View style={styles.unityContainer}>
          <UnityView style={styles.unityView} />
        </View>

        <View style={styles.verticalGuide}/>

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
    backgroundColor: '#f5f5f5',
  },
  unityContainer: {
    flex: 0.5, // 화면 상단 50%
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 2,
    borderBottomColor: '#ddd',
  },
  unityView: {
    flex: 1,
    width: '100%',
  },
  controlPanelContainer: {
    flex: 0.5, // 화면 하단 50%
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
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
