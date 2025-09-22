import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { StatsView } from '~/shared/components';
import { StopButton } from '~/shared/components';
import { PlayButton } from '~/shared/components';

const { width, height } = Dimensions.get('window');

export const RunningPaused: React.FC = () => {

  const handleStopRunning = () => {
    // TODO: RunningViewModel.stopRunning() 호출
    console.log('러닝 종료');
  };

  const handleResumeRunning = () => {
    // TODO: RunningViewModel.resumeRunning() 호출
    console.log('러닝 재개');
  };

  return (
    <View style={styles.container}>
      {/* Running Statistics (showing current progress) */}
      <StatsView />

      {/* Control Buttons */}
      <View style={styles.buttonContainer}>
        <View style={styles.spacer} />

        {/* Stop Button */}
        <StopButton onPress={handleStopRunning} />

        <View style={styles.spacer} />

        {/* Resume Button */}
        <PlayButton onPress={handleResumeRunning} />

        <View style={styles.spacer} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 25,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
  },
  spacer: {
    flex: 1,
  },
});