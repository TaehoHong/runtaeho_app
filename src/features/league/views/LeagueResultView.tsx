/**
 * LeagueResultView
 * 리그 결과 화면 (승급/강등/유지/환생 알림)
 *
 * 피그마: #리그_결과_화면
 */

import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  type LeagueResult,
  TIER_INFO,
  getResultMessage,
} from '../models';
import { TIER_IMAGES } from '~/shared/constants/images';
import { PRIMARY, GREY } from '~/shared/styles';

interface LeagueResultViewProps {
  result: LeagueResult;
}

export const LeagueResultView = ({ result }: LeagueResultViewProps) => {
  const router = useRouter();

  // 현재 티어 정보 (결과 상태에 따라 표시할 티어)
  const tierType = result.currentTier;
  const tierInfo = TIER_INFO[tierType];
  const tierImage = TIER_IMAGES[tierType];

  // 상태별 메시지
  const message = getResultMessage(result.resultStatus, tierInfo.displayName);

  // 결과 확인 버튼 클릭
  const handleConfirm = () => {
    router.push({
      pathname: '/league/result-detail' as const,
      params: { resultData: JSON.stringify(result) },
    } as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* 티어 이름 */}
        <Text style={[styles.tierName, { color: tierInfo.color }]}>
          {tierInfo.displayName} 리그
        </Text>

        {/* 티어 이미지 */}
        <View style={styles.tierImageContainer}>
          <Image
            source={tierImage}
            style={styles.tierImage}
            contentFit="contain"
          />
        </View>

        {/* 결과 메시지 */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>{message.title}</Text>
          <Text style={styles.messageSubtitle}>{message.subtitle}</Text>
        </View>
      </View>

      {/* 결과 확인 버튼 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>결과 확인</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREY[50],
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  tierName: {
    fontSize: 28,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    marginBottom: 24,
  },
  tierImageContainer: {
    width: 280,
    height: 174,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  tierImage: {
    width: 280,
    height: 174,
  },
  messageContainer: {
    alignItems: 'center',
  },
  messageTitle: {
    fontSize: 20,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: GREY[900],
    marginBottom: 8,
  },
  messageSubtitle: {
    fontSize: 20,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: GREY[900],
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  confirmButton: {
    backgroundColor: PRIMARY[600],
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 20,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    color: GREY.WHITE,
  },
});
