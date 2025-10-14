/**
 * 구매 확인 모달
 * SRP: 구매 확인 UI만 담당
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { AvatarItem } from '~/features/avatar';
import { AVATAR_COLORS, BUTTON_SIZE } from '~/features/avatar';

interface Props {
  items: readonly AvatarItem[];
  totalPrice: number;
  currentPoints: number;
  remainingPoints: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const PurchaseModal: React.FC<Props> = ({
  items,
  totalPrice,
  currentPoints,
  remainingPoints,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* Dimmed Background */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        {/* Modal Content */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modal}>
            {/* Title */}
            <Text style={styles.title}>구매 내역</Text>
            <Text style={styles.subtitle}>해당 아이템을 구매할까요?</Text>

            {/* Items Preview */}
            <View style={styles.itemsContainer}>
              {items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemPlaceholder} />
                  <View style={styles.itemPriceContainer}>
                    <View style={styles.priceIcon} />
                    <Text style={styles.itemPrice}>{item.price}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Points Calculation */}
            <View style={styles.calculationContainer}>
              <View style={styles.divider} />

              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>보유 포인트</Text>
                <Text style={styles.pointValue}>
                  {currentPoints.toLocaleString()} P
                </Text>
              </View>

              <View style={styles.pointRow}>
                <Text style={styles.pointLabel}>총 구매 금액</Text>
                <Text style={[styles.pointValue, styles.pointDecrease]}>
                  -{totalPrice.toLocaleString()} P
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.pointRow}>
                <Text style={[styles.pointLabel, styles.pointLabelBold]}>
                  잔여 포인트
                </Text>
                <Text style={[styles.pointValue, styles.pointIncrease]}>
                  {remainingPoints.toLocaleString()} P
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>구매 취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={onConfirm}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>즉시 구매</Text>
                )}
              </TouchableOpacity>
            </View>
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
  modal: {
    width: 335,
    backgroundColor: AVATAR_COLORS.CARD_BACKGROUND,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AVATAR_COLORS.PRIMARY_TEXT,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: AVATAR_COLORS.SECONDARY_TEXT,
    textAlign: 'center',
    marginBottom: 24,
  },
  itemsContainer: {
    marginBottom: 24,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: AVATAR_COLORS.ITEM_BACKGROUND,
  },
  itemPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AVATAR_COLORS.POINT_ICON,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: AVATAR_COLORS.PRIMARY_TEXT,
  },
  calculationContainer: {
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: AVATAR_COLORS.ITEM_BACKGROUND,
    marginVertical: 12,
  },
  pointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  pointLabel: {
    fontSize: 16,
    color: AVATAR_COLORS.SECONDARY_TEXT,
  },
  pointLabelBold: {
    fontWeight: '600',
    color: AVATAR_COLORS.PRIMARY_TEXT,
  },
  pointValue: {
    fontSize: 16,
    fontWeight: '600',
    color: AVATAR_COLORS.PRIMARY_TEXT,
  },
  pointDecrease: {
    color: AVATAR_COLORS.POINT_DECREASE,
  },
  pointIncrease: {
    color: AVATAR_COLORS.POINT_INCREASE,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: BUTTON_SIZE.MODAL_BUTTON_HEIGHT,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: AVATAR_COLORS.CANCEL_BUTTON,
  },
  confirmButton: {
    backgroundColor: AVATAR_COLORS.PURCHASE_BUTTON,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AVATAR_COLORS.PRIMARY_TEXT,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
