/**
 * 하단 버튼 (취소 / 확인 or 구매)
 * SRP: 하단 액션 버튼만 담당
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { AVATAR_COLORS } from '~/features/avatar';

interface Props {
  hasChanges: boolean;
  shouldShowPurchase: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const BottomButtons: React.FC<Props> = ({
  hasChanges,
  shouldShowPurchase,
  onCancel,
  onConfirm,
  isLoading,
}) => {
  return (
    <View style={styles.container}>
      {/* Cancel Button */}
      <TouchableOpacity
        style={[
          styles.button,
          styles.cancelButton,
          !hasChanges && styles.buttonDisabled,
        ]}
        onPress={onCancel}
        disabled={!hasChanges || isLoading}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            !hasChanges && styles.buttonTextDisabled,
          ]}
        >
          취소
        </Text>
      </TouchableOpacity>

      {/* Confirm / Purchase Button */}
      <TouchableOpacity
        style={[
          styles.button,
          shouldShowPurchase ? styles.purchaseButton : styles.confirmButton,
          !hasChanges && styles.buttonDisabled,
        ]}
        onPress={onConfirm}
        disabled={!hasChanges || isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text
            style={[
              styles.buttonText,
              styles.buttonTextWhite,
              !hasChanges && styles.buttonTextDisabled,
            ]}
          >
            {shouldShowPurchase ? '구매' : '확인'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: AVATAR_COLORS.CARD_BACKGROUND,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: AVATAR_COLORS.CANCEL_BUTTON,
  },
  confirmButton: {
    backgroundColor: AVATAR_COLORS.CONFIRM_BUTTON,
  },
  purchaseButton: {
    backgroundColor: AVATAR_COLORS.PURCHASE_BUTTON,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: AVATAR_COLORS.PRIMARY_TEXT,
  },
  buttonTextWhite: {
    color: '#FFFFFF',
  },
  buttonTextDisabled: {
    color: AVATAR_COLORS.DISABLED_TEXT,
  },
});
