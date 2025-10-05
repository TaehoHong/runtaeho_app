import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAuthStore, useAppStore, ViewState } from '~/stores';
import { LoadingView } from '~/shared/components';
import { ControlPanelView } from './ControlPanelView';
import { createUnityBridgeService } from '~/features/unity/bridge/UnityBridgeService';

/**
 * 메인 러닝 화면
 * iOS RunningView 대응
 * 로딩/로드 상태에 따라 UI 분기
 * Unity 컴포넌트 + 상태별 컴트롤 패널
 */
export const RunningView: React.FC = () => {
  const viewState = useAppStore((state) => state.viewState);
  const runningState = useAppStore((state) => state.runningState);
  const setViewState = useAppStore((state) => state.setViewState);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const [unityReady, setUnityReady] = useState(false);
  const [unityStarted, setUnityStarted] = useState(false);
  const [unityBridge] = useState(() => createUnityBridgeService());

  console.log('🏃 [RunningView] 렌더링, viewState:', viewState, 'runningState:', runningState, 'isLoggedIn:', isLoggedIn);

  useEffect(() => {
    console.log('🔄 [RunningView] 컴포넌트 마운트');

    // Unity 이벤트 리스너 등록
    unityBridge.addEventListener('UnityReady', (event: any) => {
      console.log('🎮 [RunningView] Unity 준비 완료:', event);
      setUnityReady(true);
    });

    unityBridge.addEventListener('UnityError', (error: any) => {
      console.error('❌ [RunningView] Unity 오류:', error);
      setUnityReady(false);
    });

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
  }, [viewState, isLoggedIn, unityStarted, setViewState, unityBridge]);

  /**
   * Unity 시작
   * iOS unity.start() 대응
   */
  const startUnity = async () => {
    try {
      console.log('🎮 [RunningView] Unity 시작 시도');

      // Unity 상태 확인 및 초기화
      await unityBridge.getUnityStatus();
      console.log('✅ [RunningView] Unity 브릿지 연결 성공');

      // Unity 캐릭터 초기 설정
      await unityBridge.setCharacterMotion('IDLE');
      await unityBridge.setCharacterSpeed(0);

      setUnityReady(true);
      console.log('✅ [RunningView] Unity 시작 성공');
    } catch (error) {
      console.error('❌ [RunningView] Unity 시작 실패:', error);
      setUnityReady(false);
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
    <View style={styles.container}>
      {/* Unity 컴포넌트 - 화면 상단 50% */}
      <View style={styles.unityContainer}>
        <UnityPlaceholder isReady={unityReady} bridge={unityBridge} />
      </View>
      
      {/* DEBUG 뷰 (개발 모드에서만) */}
      {__DEV__ && (
        <DebugView />
      )}
      
      {/* 컴트롤 패널 - 화면 하단 */}
      <View style={styles.controlPanelContainer}>
        <ControlPanelView />
      </View>
      
      {/* 알림 들 (iOS alert 대응) */}
      <RunningAlerts />
    </View>
  );
};

/**
 * 디버그 뷰 컴포넌트
 * iOS #if DEBUG DebugView 대응
 */
const DebugView: React.FC = () => {
  console.log('🐛 [DebugView] 디버그 뷰 렌더링');
  
  return (
    <View style={styles.debugContainer}>
      {/* TODO: 디버그 UI 구현 */}
    </View>
  );
};

/**
 * Unity 플레이스홀더 컴포넌트
 * Unity가 준비될 때까지 표시되는 안전한 컴포넌트
 */
const UnityPlaceholder: React.FC<{ isReady: boolean; bridge: any }> = ({ isReady, bridge }) => {
  const [dotCount, setDotCount] = React.useState(0);
  const [testMessage, setTestMessage] = React.useState('');

  React.useEffect(() => {
    if (!isReady) {
      const interval = setInterval(() => {
        setDotCount((prev) => (prev + 1) % 4);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isReady]);

  const testUnityConnection = async () => {
    try {
      await bridge.setCharacterSpeed(Math.random() * 10);
      await bridge.setCharacterMotion('MOVE');
      setTestMessage('Unity 브릿지 테스트 성공! 🎮');

      setTimeout(() => {
        bridge.setCharacterMotion('IDLE');
      }, 2000);
    } catch (error) {
      setTestMessage('Unity 브릿지 테스트 실패 ❌');
    }
  };

  if (isReady) {
    return (
      <View style={styles.unityPlaceholder}>
        <View style={styles.characterArea}>
          <Text style={styles.characterIcon}>🎮</Text>
          <Text style={styles.placeholderTitle}>Unity 연결됨!</Text>
          <Text style={styles.placeholderSubtitle}>3D 캐릭터 준비 완료</Text>
          {testMessage ? (
            <Text style={styles.testMessage}>{testMessage}</Text>
          ) : null}
          <Text
            style={styles.testButton}
            onPress={testUnityConnection}
          >
            Unity 테스트 🔄
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.unityPlaceholder}>
      <View style={styles.characterArea}>
        <Text style={styles.characterIcon}>🏃‍♂️</Text>
        <Text style={styles.placeholderTitle}>
          Unity 준비 중{'.'.repeat(dotCount)}
        </Text>
        <Text style={styles.placeholderSubtitle}>3D 캐릭터 표시 영역</Text>
      </View>
    </View>
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
    backgroundColor: 'white',
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
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  debugContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  unityPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8f4f8',
    margin: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  characterArea: {
    alignItems: 'center',
    padding: 20,
  },
  characterIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  testMessage: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 8,
    textAlign: 'center',
  },
  testButton: {
    fontSize: 16,
    color: '#2196F3',
    marginTop: 16,
    padding: 8,
    textAlign: 'center',
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
});
