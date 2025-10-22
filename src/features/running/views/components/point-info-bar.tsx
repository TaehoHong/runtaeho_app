import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Icon } from '~/shared/components/ui';

interface PointInfoBarProps {
  earnedPoints: number;
  totalPoints: number;
}

/**
 * 포인트 정보 바 컴포넌트
 * 획득 포인트와 보유 포인트를 표시
 */
export const PointInfoBar: React.FC<PointInfoBarProps> = ({
  earnedPoints,
  totalPoints,
}) => {
  return (
    <View style={[styles.container]}>
      {/* 획득 포인트 */}
      <View style={styles.section}>
        <Text style={styles.label}>획득 포인트</Text>
        <View style={styles.pointContainer}>
          {/* 포인트 아이콘 - 임시로 동그라미 사용 */}
          <Icon name="point" size={16}/>
          <View style={styles.earnedPointsWrapper}>
            <Text style={styles.plusSign}>+</Text>
            <Text style={styles.earnedPointsValue}>{earnedPoints}</Text>
          </View>
        </View>
      </View>

      {/* 보유 포인트 */}
      <View style={styles.section}>
        <Text style={styles.label}>보유 포인트</Text>
        <View style={styles.pointContainer}>
          {/* 포인트 아이콘 - 임시로 동그라미 사용 */}
          <Icon name="point" size={16}/>
          <Text style={styles.totalPointsValue}>
            {totalPoints.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#9D9D9D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingLeft: 32,
    paddingRight: 32,
    alignSelf: 'stretch',
    height: 44,
    marginHorizontal: -16
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    color: '#FFFFFF',
  },
  pointContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#59EC3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  earnedPointsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plusSign: {
    fontFamily: 'Rounded Mplus 1c Bold',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 14,
    color: '#59EC3A',
    letterSpacing: -0.3,
  },
  earnedPointsValue: {
    fontFamily: 'Rounded Mplus 1c Bold',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 14,
    color: '#59EC3A',
    letterSpacing: -0.3,
  },
  totalPointsValue: {
    fontFamily: 'Rounded Mplus 1c Bold',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 14,
    color: '#59EC3A',
    letterSpacing: -0.3,
  },
});
