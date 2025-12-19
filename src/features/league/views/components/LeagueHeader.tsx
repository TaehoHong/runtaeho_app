/**
 * LeagueHeader Component
 * 리그 상단 티어 정보 표시
 */

import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LeagueTierType, TIER_INFO } from '../../models';
import { GREY } from '~/shared/styles';
import { TIER_IMAGES } from '~/shared/constants/images';

interface LeagueHeaderProps {
  tierType: LeagueTierType;
}

export const LeagueHeader = ({ tierType }: LeagueHeaderProps) => {
  const tierInfo = TIER_INFO[tierType];
  const tierImage = TIER_IMAGES[tierType];

  return (
    <View style={styles.container}>
      <View style={styles.tierInfo}>
        {/* 티어 이미지 */}
        <View style={styles.tierImageContainer}>
          <Image
            source={tierImage}
            style={styles.tierImage}
            contentFit="contain"
          />
        </View>

        {/* 티어 이름 */}
        <View style={styles.tierTextInfo}>
          <Text style={[styles.tierName, { color: tierInfo.color }]}>
            {tierInfo.displayName}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: GREY.WHITE,
    paddingVertical: 7,
    paddingHorizontal: 16,
    height: 120,
  },
  tierInfo: {
    flex: 1,
    backgroundColor: GREY.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 10,
  },
  tierImageContainer: {
    width: 99,
    height: 63,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierImage: {
    width: 99,
    height: 63,
  },
  tierTextInfo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierName: {
    fontSize: 20,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
  },
});
