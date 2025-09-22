import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';

interface CompleteButtonProps {
  onPress: () => void;
}

export const CompleteButton: React.FC<CompleteButtonProps> = ({ onPress }) => {
  // TODO: RunningFinishedViewModel에서 버튼 색상 상태 가져오기
  const completeButtonColor = '#007AFF';

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
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
});