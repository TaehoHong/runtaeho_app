import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Text } from '~/shared/components/typography';

interface PauseButtonProps {
  onPress: () => void;
}

export const PauseButton: React.FC<PauseButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>일시정지</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#747474',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});