import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { StartButton } from '~/shared/components';

export const RunningStart: React.FC = () => {

  const handleStartRunning = () => {
    // TODO: RunningViewModel.startRunning() 호출
    console.log('러닝 시작');
  };

  return (
    <View style={styles.container}>
      <StartButton onPress={handleStartRunning} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
});