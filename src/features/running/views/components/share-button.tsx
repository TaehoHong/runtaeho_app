/**
 * ShareButton Component
 * 러닝 기록 공유 버튼
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, GREY } from '~/shared/styles';

interface ShareButtonProps {
  /** 버튼 클릭 콜백 */
  onPress: () => void;
  /** 비활성화 상태 */
  disabled?: boolean;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ onPress, disabled = false }) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons
        name="share-social"
        size={18}
        color={disabled ? GREY[400] : PRIMARY[600]}
      />
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
        공유하기
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 90,
    height: 46,
    borderRadius: 8,
    backgroundColor: GREY.WHITE,
    borderWidth: 2,
    borderColor: PRIMARY[600],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    // 그림자 (iOS)
    shadowColor: PRIMARY[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    // 그림자 (Android)
    ...Platform.select({
      android: {
        elevation: 3,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.5,
    borderColor: GREY[300],
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY[600],
    fontFamily: 'Pretendard-SemiBold',
  },
  buttonTextDisabled: {
    color: GREY[400],
  },
});

export default ShareButton;
