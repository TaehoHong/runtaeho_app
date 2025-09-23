import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
  Text,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RunningStart } from './running-start';
import { RunningActive } from './running-active';
import { RunningPaused } from './running-paused';
import { RunningFinished } from './running-finished';
import {
  selectIsUnityConnected,
  selectCharacterState,
  checkUnityConnection,
  setCharacterMotion,
  stopCharacter,
} from '~/store/slices/unitySlice';

const { width, height } = Dimensions.get('window');

type RunningViewState = 'Stopped' | 'Running' | 'Paused' | 'Finished';

interface RunningProps {
  runningState: RunningViewState;
  // Unity 관련 props는 나중에 추가
}

export const Running: React.FC<RunningProps> = ({
  runningState,
}) => {
  const dispatch = useDispatch();

  // Unity 상태 관리
  const isUnityConnected = useSelector(selectIsUnityConnected);
  const characterState = useSelector(selectCharacterState);

  useEffect(() => {
    // Unity 연결 상태 확인
    dispatch(checkUnityConnection() as any);
  }, [dispatch]);

  useEffect(() => {
    // 러닝 상태에 따라 Unity 캐릭터 모션 변경
    const updateUnityCharacter = async () => {
      try {
        switch (runningState) {
          case 'Stopped':
            await dispatch(setCharacterMotion('IDLE') as any);
            break;
          case 'Running':
            await dispatch(setCharacterMotion('MOVE') as any);
            break;
          case 'Paused':
            await dispatch(setCharacterMotion('IDLE') as any);
            break;
          case 'Finished':
            await dispatch(stopCharacter() as any);
            await dispatch(setCharacterMotion('IDLE') as any);
            break;
        }
      } catch (error) {
        console.warn('Unity 캐릭터 모션 업데이트 실패:', error);
      }
    };

    if (isUnityConnected) {
      updateUnityCharacter();
    }
  }, [runningState, isUnityConnected, dispatch]);

  const renderControlPanel = () => {
    switch (runningState) {
      case 'Stopped':
        return <RunningStart />;
      case 'Running':
        return <RunningActive />;
      case 'Paused':
        return <RunningPaused />;
      case 'Finished':
        return <RunningFinished />;
      default:
        return <RunningStart />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Unity View - 화면 상단 50% */}
      <View style={styles.unityContainer}>
        {/* Unity 상태 표시 */}
        <View style={styles.unityStatusOverlay}>
          <Text style={styles.unityStatusText}>
            Unity: {isUnityConnected ? '연결됨' : '연결 안됨'}
          </Text>
          {characterState && (
            <Text style={styles.characterStatusText}>
              캐릭터: {characterState.motion} ({characterState.speed}km/h)
            </Text>
          )}
        </View>

        {/* Unity View Placeholder */}
        <View style={styles.unityPlaceholder}>
          <Text style={styles.placeholderText}>
            Unity 캐릭터 화면
          </Text>
          <Text style={styles.placeholderSubText}>
            {runningState === 'Running' ? '달리는 중...' :
             runningState === 'Paused' ? '일시정지' :
             runningState === 'Finished' ? '완료!' : '대기 중'}
          </Text>
        </View>
      </View>

      {/* Control Panel - 화면 하단 50% */}
      <View style={styles.controlPanelContainer}>
        {renderControlPanel()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  unityContainer: {
    flex: 0.5, // 상단 50%
    width: '100%',
    position: 'relative',
  },
  unityStatusOverlay: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 12,
  },
  unityStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  characterStatusText: {
    color: 'white',
    fontSize: 12,
  },
  unityView: {
    flex: 1,
  },
  unityPlaceholder: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  placeholderSubText: {
    fontSize: 14,
    color: '#666',
  },
  controlPanelContainer: {
    flex: 0.5, // 하단 50%
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});