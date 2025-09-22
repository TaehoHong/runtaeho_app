import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

export const PointEarnCard: React.FC = () => {
  // TODO: RunningFinishedViewModel에서 포인트 데이터 가져오기
  const earnedPoints = 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>획득 포인트</Text>
      <Text style={styles.points}>{earnedPoints}P</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  points: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
});