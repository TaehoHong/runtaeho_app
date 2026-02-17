import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RunningView } from '~/features/running/views/RunningView';

/**
 * 러닝 화면
 */
export default function RunningScreen() {
  console.log('🏃 [RUNNING_SCREEN] 러닝 화면 렌더링');

  return (
    <View style={styles.container} testID="running-screen">
      <RunningView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
