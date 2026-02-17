import { LeagueView } from '~/features/league/views/LeagueView';
import { StyleSheet, View } from 'react-native';

/**
 * 리그 화면
 * 리그 순위 및 티어 정보 표시
 */
export default function LeagueScreen() {
  console.log('🏆 [LEAGUE_SCREEN] 리그 화면 렌더링');

  return (
    <View style={styles.container} testID="league-screen">
      <LeagueView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
