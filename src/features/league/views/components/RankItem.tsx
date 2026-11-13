import { useAppTranslation } from '~/i18n';
/**
 * RankItem Component
 * 순위표의 개별 항목
 */

import { StyleSheet, View } from 'react-native';
import { NativeText as Text } from '~/shared/components/typography';
import { Image } from 'expo-image';
import { PRIMARY, GREY } from '~/shared/styles';
import { formatDistance, type LeagueParticipant } from '../../models';
import { buildFullImageUrl } from '~/features/user/models/UserDataDto';

interface RankItemProps {
  participant: LeagueParticipant;
  expanded?: boolean;
  rowHeight?: number;
  resultRow?: boolean;
}

export const RANK_ITEM_HEIGHT = 56;
export const LARGE_RANK_LINE_HEIGHT = 20;


export const RankItem = ({ participant, expanded = false, rowHeight = RANK_ITEM_HEIGHT, resultRow = false }: RankItemProps) => {
  const t = useAppTranslation();
  const isMe = participant.isMe;
  const meText = resultRow ? styles.resultTextMe : styles.textMe;
  const displayName = isMe ? t("나") : (participant.nickname ?? t("익명"));
  const distanceFormatted = formatDistance(participant.distance);
  const fullImageUrl = buildFullImageUrl(participant?.profileImageUrl);
  const imageSource = fullImageUrl
    ? { uri: fullImageUrl }  // 전체 URL로 변환 후 사용
    : require('assets/images/default-profile-image.png');  // 로컬 파일

  const identity = (
    <>
      {/* 순위 */}
      <Text style={[styles.rank, resultRow && styles.resultRank, isMe && meText]}>
        {participant.rank}
      </Text>

      {/* 프로필 이미지 */}
      <View style={[styles.avatarContainer, isMe && styles.avatarContainerMe]}>
        <Image
          source={imageSource}
          style={styles.avatarImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>

      {/* 이름 */}
      <Text style={[styles.name, isMe && meText, expanded && styles.expandedText]} numberOfLines={expanded ? 2 : resultRow ? 1 : undefined}>
        {displayName}
      </Text>
    </>
  );

  return (
    <View style={[styles.container, expanded && styles.containerExpanded, resultRow && styles.resultRow, isMe && styles.containerMe, { height: rowHeight }]}>
      {expanded ? <View style={styles.identityRow}>{identity}</View> : identity}
      {/* 거리 */}
      <Text style={[styles.distance, isMe && meText, expanded && styles.expandedText]} numberOfLines={expanded ? 1 : undefined} adjustsFontSizeToFit={expanded}>
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
    height: RANK_ITEM_HEIGHT,
    gap: 12,
  },
  containerExpanded: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandedText: {
    lineHeight: LARGE_RANK_LINE_HEIGHT,
    minWidth: 0,
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
  avatarContainer: {
    width: 32,
    height: 32,
    backgroundColor: PRIMARY[50],
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainerMe: {
    backgroundColor: PRIMARY[600],
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GREY[300],
  },
  avatarInitial: {
    fontSize: 14,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: PRIMARY[600],
  },
  avatarInitialMe: {
    color: GREY.WHITE,
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
  resultRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GREY[100],
  },
  resultRank: {
    color: GREY[900],
    minWidth: 10,
    textAlign: 'left',
  },
  resultTextMe: {
    color: PRIMARY[950],
  },
});
