import React from 'react';
import { GREY, PRIMARY } from '~/shared/styles';
import {
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Text } from '~/shared/components/typography';

interface PlayButtonProps {
  onPress: () => void;
}

export const PlayButton: React.FC<PlayButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>재개</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY[600],
    justifyContent: 'center',
    alignItems: 'center',
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
    color: GREY.WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
});