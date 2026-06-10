import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '~/shared/components/typography';
import { GREY, PRIMARY } from '~/shared/styles';

interface ErrorPopupProps {
  visible: boolean;
  onClose: () => void;
  onInquiry: () => void;
}

export const ErrorPopup: React.FC<ErrorPopupProps> = ({
  visible,
  onClose,
  onInquiry,
}) => {
  return (
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
            <Ionicons name="alert-outline" size={22} color={PRIMARY[600]} />
          </View>
          <Text style={styles.title}>앱에 문제가 발생했어요</Text>
          <Text style={styles.message}>
            문제가 계속되면 오류 문의를 남겨주세요.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onInquiry}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryText}>오류 문의하기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeText}>닫기</Text>
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
    color: GREY[900],
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    fontWeight: '400',
    color: GREY[600],
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
    color: GREY[500],
  },
});
