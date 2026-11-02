import { useAppTranslation } from '~/i18n';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '~/shared/components/typography';
import { GREY, PRIMARY } from '~/shared/styles';

type HealthPermissionModalProps = {
  visible: boolean;
  onClose: () => void;
  onRequestPermission: () => void;
};

export const HealthPermissionModal: React.FC<HealthPermissionModalProps> = ({
  visible,
  onClose,
  onRequestPermission,
}) => {
  const t = useAppTranslation();
  const insets = useSafeAreaInsets();
  return (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onClose}
  >
    <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.card}>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} bounces={false}>
        <View style={styles.iconBox}>
          <Ionicons name="fitness-outline" size={22} color={PRIMARY[600]} />
        </View>
        <Text style={styles.title}>{t("Health 권한 설정")}</Text>
        <Text style={styles.message} lineBreakStrategyIOS="hangul-word">{t("Health에 저장된 러닝 기록 접근을 위해 권한이 필요합니다.")}</Text>
        </ScrollView>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onRequestPermission}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t("권한 설정")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.closeText}>{t("나중에")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  card: {
    width: '100%',
    maxWidth: 328,
    maxHeight: '100%',
    borderRadius: 20,
    backgroundColor: GREY.WHITE,
    padding: 24,
    alignItems: 'center',
  },
  body: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY[50],
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Pretendard',
    color: GREY[900],
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Pretendard',
    color: GREY[700],
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    width: '100%',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY[600],
  },
  primaryText: {
    maxWidth: '100%',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  closeButton: {
    minHeight: 44,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[500],
  },
});
