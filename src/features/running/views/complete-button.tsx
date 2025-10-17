import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Text } from '~/shared/components/typography';

interface CompleteButtonProps {
  onPress: () => void;
}

export const CompleteButton: React.FC<CompleteButtonProps> = ({ onPress }) => {
  // TODO: RunningFinishedViewModel에서 버튼 색상 상태 가져오기
  const completeButtonColor = '#00C851'; // 녹색 버튼

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: completeButtonColor }]}
      onPress={onPress}
    >
      <Text style={styles.text}>확인</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});