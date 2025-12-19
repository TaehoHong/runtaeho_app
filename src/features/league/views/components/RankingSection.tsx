/**
 * RankingSection Component
 * 순위표 섹션
 */

import { StyleSheet, Text, View, FlatList } from 'react-native';
import { GREY } from '~/shared/styles';
import type { LeagueParticipant } from '../../models';
import { RankItem } from './RankItem';

interface RankingSectionProps {
  participants: LeagueParticipant[];
}

export const RankingSection = ({ participants }: RankingSectionProps) => {
  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>순위표</Text>
      </View>

      {/* 순위 리스트 */}
      <View style={styles.list}>
        {participants.map((participant) => (
          <RankItem key={participant.rank} participant={participant} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: GREY.WHITE,
    marginHorizontal: 16,
    marginTop: 23,
    borderRadius: 8,
    paddingBottom: 16,
    minHeight: 400,
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    color: GREY[900],
  },
  list: {
    paddingHorizontal: 16,
  },
});
