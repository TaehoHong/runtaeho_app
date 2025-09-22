import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

export const StatsView: React.FC = () => {
  // TODO: RunningViewModel에서 실시간 데이터 가져오기
  const distance = '0.00'; // km
  const time = '00:00:00'; // HH:MM:SS
  const pace = '0\'00"'; // pace per km

  return (
    <View style={styles.container}>
      {/* Distance */}
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{distance}</Text>
        <Text style={styles.statLabel}>거리 (km)</Text>
      </View>

      {/* Time */}
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{time}</Text>
        <Text style={styles.statLabel}>시간</Text>
      </View>

      {/* Pace */}
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{pace}</Text>
        <Text style={styles.statLabel}>페이스</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
});