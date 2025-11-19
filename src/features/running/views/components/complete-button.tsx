import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Text } from '~/shared/components/typography';
import { PRIMARY, GREY } from '~/shared/styles';

interface CompleteButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export const CompleteButton: React.FC<CompleteButtonProps> = ({ onPress, disabled = false }) => {
  // TODO: RunningFinishedViewModel에서 버튼 색상 상태 가져오기
  const completeButtonColor = disabled ? GREY[300] : PRIMARY[600]; // 비활성화 시 회색, 활성화 시 녹색

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: completeButtonColor }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Text style={[styles.text, disabled && styles.textDisabled]}>확인</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 42,
    width: 73,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: GREY.WHITE,
  },
  textDisabled: {
    color: GREY[400],
  },
});