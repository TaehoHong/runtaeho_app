/**
 * 포인트 부족 알림 모달
 * SRP: 포인트 부족 안내 UI만 담당
 */

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ERROR_MESSAGES } from '~/features/avatar';
import { GREY, RED } from '~/shared/styles';

interface Props {
  onClose: () => void;
}

export const InsufficientPointsAlert: React.FC<Props> = ({ onClose }) => {
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Dimmed Background */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Alert Content */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.alert}>
            {/* Message */}
            <Text style={styles.message}>
              {ERROR_MESSAGES.INSUFFICIENT_POINTS_DETAIL}
            </Text>

            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alert: {
    width: 324,
    backgroundColor: GREY[50],
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 16,
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    color: GREY[900],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  button: {
    width: 292,
    height: 48,
    backgroundColor: RED[300],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY.WHITE,
  },
});
