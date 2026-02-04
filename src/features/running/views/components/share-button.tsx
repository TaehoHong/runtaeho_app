/**
 * ShareButton Component
 * 러닝 기록 공유 버튼
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { GREY } from '~/shared/styles';

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
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
        공유
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: GREY[100],
    borderWidth: 1,
    borderColor: GREY[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: GREY[800],
    fontFamily: 'Pretendard-SemiBold',
  },
  buttonTextDisabled: {
    color: GREY[400],
  },
});

export default ShareButton;
