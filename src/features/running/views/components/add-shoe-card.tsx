import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Text } from '~/shared/components/typography';
import { Icon } from '~/shared/components/ui';
import { PRIMARY, GREY } from '~/shared/styles';

/**
 * 신발 추가 카드
 * 피그마 디자인: 261x165 카드 → 클릭 시 모달 오픈
 */
export const AddShoeCard: React.FC = () => {
  const handlePress = () => {
    router.push('/shoes/add-shoe');
  };

  return (
    <TouchableOpacity
      style={styles.collapsedCard}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* 상단 회색 배경 영역 */}
      <View style={styles.topContainer}>
        <View style={styles.iconAndTextContainer}>
          {/* 녹색 원형 아이콘 */}
          <View style={styles.iconContainer}>
            <Icon name="confirm" size={24} tintColor={GREY.WHITE} />
          </View>
          {/* "신발 추가하기" 텍스트 */}
          <Text style={styles.title}>신발 추가하기</Text>
        </View>
      </View>

      {/* 하단 안내 문구 */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>
          신발을 추가하여 마일리지를 관리해보세요.
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Collapsed Card (피그마 디자인)
  collapsedCard: {
    width: 261,
    backgroundColor: GREY.WHITE,
    borderRadius: 8,
    padding: 12,
    gap: 12,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  // 상단 회색 배경 컨테이너
  topContainer: {
    height: 113,
    backgroundColor: '#FAFAFA', // neutral-50
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  // 아이콘 + 텍스트 묶음
  iconAndTextContainer: {
    alignItems: 'center',
    gap: 8,
  },
  // 녹색 원형 아이콘
  iconContainer: {
    width: 41,
    height: 41,
    borderRadius: 999,
    backgroundColor: PRIMARY[600], // #45DA31
    justifyContent: 'center',
    alignItems: 'center',
  },
  // "신발 추가하기" 텍스트
  title: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: '#606060',
    textAlign: 'center',
    lineHeight: 18,
  },
  // 하단 안내 문구 컨테이너
  descriptionContainer: {
    paddingHorizontal: 2,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 안내 문구 텍스트
  description: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[400], // #BCBCBC
    textAlign: 'center',
    lineHeight: 16,
  },
});
