import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * 통계 화면
 * iOS StatisticView 대응
 */
export default function StatisticsScreen() {
  console.log('📊 [STATISTICS_SCREEN] 통계 화면 렌더링');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>통계</Text>
      <Text style={styles.subtitle}>러닝 통계 데이터가 표시됩니다</Text>
      <Text style={styles.description}>
        iOS StatisticView에서 마이그레이션 예정
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
