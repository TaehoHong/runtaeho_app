import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { RunningStart } from './running-start';
import { RunningActive } from './running-active';
import { RunningPaused } from './running-paused';
import { RunningFinished } from './running-finished';
// import { UnityView } from '../../../unity/components/UnityView'; // Unity 연동 후 활성화

const { width, height } = Dimensions.get('window');

export type RunningState = 'Stopped' | 'Running' | 'Paused' | 'Finished';

interface RunningProps {
  runningState: RunningState;
  // Unity 관련 props는 나중에 추가
}

export const Running: React.FC<RunningProps> = ({
  runningState,
}) => {

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
        {/* TODO: Unity 통합 후 활성화 */}
        {/* <UnityView style={styles.unityView} /> */}
        <View style={styles.unityPlaceholder} />
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
  },
  unityView: {
    flex: 1,
  },
  unityPlaceholder: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlPanelContainer: {
    flex: 0.5, // 하단 50%
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});