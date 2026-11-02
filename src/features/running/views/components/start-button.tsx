import { useAppTranslation } from '~/i18n';
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
  disabled?: boolean;
  haveRunningRecord: boolean;
}

export const StartButton: React.FC<StartButtonProps> = ({
  onPress,
  haveRunningRecord,
  disabled = false
}) => {
  const t = useAppTranslation();
  return (
    <LinearGradient
      colors={[PRIMARY[600], '#77FFAD', '#C4FF84']}
      locations={[0, 0.52, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.gradientBorder}
    >
      <TouchableOpacity style={styles.button} onPress={onPress} disabled={disabled} accessibilityState={{ disabled }}>
        <Text style={styles.subText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
          {haveRunningRecord ? t("다시 달려볼까요?") : t("한번 달려볼까요?")}
        </Text>
        <Text style={styles.mainText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{t("START !")}</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBorder: {
    width: 335,
    maxWidth: '100%',
    minHeight: 102,
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
    paddingVertical: 12,
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
