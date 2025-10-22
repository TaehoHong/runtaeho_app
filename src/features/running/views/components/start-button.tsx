import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '~/shared/components/typography';
import { PRIMARY } from '~/shared/styles';

interface StartButtonProps {
  onPress: () => void;
  haveRunningRecord: boolean;
}

export const StartButton: React.FC<StartButtonProps> = ({
  onPress,
  haveRunningRecord
}) => {

  console.log('haveRunningRecord:', haveRunningRecord)

  return (
    <LinearGradient
      colors={[PRIMARY[600], '#77FFAD', '#C4FF84']}
      locations={[0, 0.52, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.gradientBorder}
    >
      <TouchableOpacity style={styles.button} onPress={onPress}>
        <Text style={styles.subText}>
          {haveRunningRecord ? '다시 달려볼까요?' : '한번 달려볼까요?'}
        </Text>
        <Text style={styles.mainText}>START !</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBorder: {
    width: 335,
    height: 102,
    borderRadius: 8,
    padding: 2,
  },
  button: {
    flex: 1,
    backgroundColor: PRIMARY[50],
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  subText: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    color: PRIMARY[600],
    textAlign: 'center',
  },
  mainText: {
    fontFamily: 'Cafe24PROUP',
    fontSize: 36,
    fontWeight: '400',
    color: PRIMARY[600],
    textAlign: 'center',
    letterSpacing: -0.3,
  },
});