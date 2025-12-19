/**
 * RankItem Component
 * 순위표의 개별 항목
 */

import { StyleSheet, Text, View } from 'react-native';
import { PRIMARY, GREY } from '~/shared/styles';
import { formatDistance, type LeagueParticipant } from '../../models';

interface RankItemProps {
  participant: LeagueParticipant;
}

export const RankItem = ({ participant }: RankItemProps) => {
  const isMe = participant.isMe;
  const displayName = isMe ? '나' : (participant.nickname ?? '익명');
  const distanceFormatted = formatDistance(participant.distance);

  return (
    <View style={[styles.container, isMe && styles.containerMe]}>
      {/* 순위 */}
      <Text style={[styles.rank, isMe && styles.textMe]}>
        {participant.rank}
      </Text>

      {/* 아바타 플레이스홀더 */}
      <View style={[styles.avatar, isMe && styles.avatarMe]} />

      {/* 이름 */}
      <Text style={[styles.name, isMe && styles.textMe]}>
        {displayName}
      </Text>

      {/* 거리 */}
      <Text style={[styles.distance, isMe && styles.textMe]}>
        {distanceFormatted}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREY.WHITE,
    paddingHorizontal: 10,
    paddingVertical: 12,
    height: 56,
    gap: 12,
  },
  containerMe: {
    backgroundColor: PRIMARY[50],
    borderRadius: 4,
  },
  rank: {
    fontSize: 16,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: GREY[500],
    minWidth: 24,
    textAlign: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    backgroundColor: PRIMARY[50],
    borderRadius: 4,
  },
  avatarMe: {
    backgroundColor: PRIMARY[600],
  },
  name: {
    fontSize: 14,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    color: GREY[900],
    flex: 1,
  },
  distance: {
    fontSize: 14,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: GREY[900],
  },
  textMe: {
    color: PRIMARY[600],
  },
});
