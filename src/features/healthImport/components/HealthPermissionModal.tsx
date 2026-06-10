import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
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
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onClose}
  >
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Ionicons name="fitness-outline" size={22} color={PRIMARY[600]} />
        </View>
        <Text style={styles.title}>Health 권한 설정</Text>
        <Text style={styles.message}>
          Health에 저장된 러닝 기록 접근을 위해 권한이 필요합니다.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onRequestPermission}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryText}>권한 설정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.closeText}>나중에</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

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
    borderRadius: 20,
    backgroundColor: GREY.WHITE,
    padding: 24,
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
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY[600],
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  closeButton: {
    height: 44,
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
