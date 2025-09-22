import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { StatsView, PauseButton } from '~/shared/components';

const { width, height } = Dimensions.get('window');

export const RunningActive: React.FC = () => {

  const handlePauseRunning = () => {
    // TODO: RunningViewModel.pauseRunning() 호출
    console.log('러닝 일시정지');
  };

  return (
    <View style={styles.container}>
      {/* Running Statistics */}
      <StatsView />

      {/* Pause Button */}
      <PauseButton onPress={handlePauseRunning} />
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
});