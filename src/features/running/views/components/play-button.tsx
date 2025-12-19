import React from 'react';
import { GREY } from '~/shared/styles';
import {
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PlayButtonProps {
  onPress: () => void;
}

export const PlayButton: React.FC<PlayButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={['#45DA31', '#59EC3A']}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={styles.gradient}
      >
        {/* 삼각형(▶) 아이콘 - Figma 디자인 */}
        <View style={styles.playIcon} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 65, // Figma: 65x65
    height: 65,
    borderRadius: 32.5,
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
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 0,
    height: 0,
    marginLeft: 3, // 시각적 중앙 정렬 보정
    borderLeftWidth: 15,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: GREY.WHITE,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});