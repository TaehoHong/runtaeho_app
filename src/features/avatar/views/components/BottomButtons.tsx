/**
 * 하단 버튼 (취소 / 확인 or 구매)
 * SRP: 하단 액션 버튼만 담당
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BLUE, GREY, PRIMARY } from '~/shared/styles';

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
          <ActivityIndicator color={GREY.WHITE} />
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
    // paddingBottom: 6,
    backgroundColor: GREY[50],
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: GREY[200],
  },
  confirmButton: {
    backgroundColor: PRIMARY[600],
  },
  purchaseButton: {
    backgroundColor: BLUE.SECONDARY,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: GREY[900],
  },
  buttonTextWhite: {
    color: GREY.WHITE,
  },
  buttonTextDisabled: {
    color: GREY[500],
  },
});
