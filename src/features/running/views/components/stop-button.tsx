import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GREY } from '~/shared/styles';

interface StopButtonProps {
  onPress: () => void;
}

export const StopButton: React.FC<StopButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={[GREY[700], '#ABABAB']}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={styles.gradient}
      >
      <View style={styles.stopIcon} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: GREY[600],
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
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 20,
    height: 20,
    backgroundColor: GREY.WHITE,
    borderRadius: 2,
  },
});