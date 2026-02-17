import { StatisticsView } from '~/features/statistics/views/StatisticsView'
import { StyleSheet, View } from 'react-native';

/**
 * 통계 화면
 * iOS StatisticView 대응
 */
export default function StatisticsScreen() {
  console.log('📊 [STATISTICS_SCREEN] 통계 화면 렌더링');

  return (
    <View style={styles.container} testID="statistics-screen">
      <StatisticsView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
