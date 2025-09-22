import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

export const MainDistanceCard: React.FC = () => {
  // TODO: RunningFinishedViewModel에서 거리 데이터 가져오기
  const distanceText = '0.00 km';

  return (
    <View style={styles.container}>
      <Text style={styles.distance}>{distanceText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  distance: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000000',
  },
});