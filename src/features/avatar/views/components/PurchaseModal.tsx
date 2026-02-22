/**
 * 구매 확인 모달
 * SRP: 구매 확인 UI만 담당
 */

import React from 'react';
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Item } from '~/features/avatar';
import { resolveAvatarItemImage } from '~/features/avatar/utils/avatarItemImageResolver';
import { Icon } from '~/shared/components/ui';
import { BLUE, GREY, PRIMARY, RED } from '~/shared/styles';

interface Props {
  items: readonly Item[];
  hairColor: string;
  totalPrice: number;
  currentPoints: number;
  remainingPoints: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const PurchaseModal: React.FC<Props> = ({
  items,
  hairColor,
  totalPrice,
  currentPoints,
  remainingPoints,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  function getItemImage(item: Item): ImageSourcePropType | undefined {
    return resolveAvatarItemImage(item, hairColor);
  }

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
              {items.map((item) => {
                const itemImage = getItemImage(item);
                return (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemImageContainer} >
                      {itemImage && (
                        <Image source={itemImage} style={styles.itemImage}/>
                      )}
                    </View>
                    <View style={styles.itemPriceContainer}>
                      <Icon name='point' size={24}/>
                      <Text style={styles.itemPrice}>{item.point}</Text>
                    </View>
                  </View>
                );
              })}
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
                  <ActivityIndicator color={GREY.WHITE} />
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
    backgroundColor: GREY[50],
    borderRadius: 16,
    paddingHorizontal: 0,
    paddingTop: 24,
    paddingBottom: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: GREY[900],
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: GREY[900],
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  itemsContainer: {
    marginBottom: 24,
    paddingHorizontal: 50,
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  itemImageContainer: {
    width: 105,
    height: 105,
    borderRadius: 14,
    backgroundColor: GREY.WHITE,
    borderWidth: 1,
    borderColor: GREY[250],
    paddingHorizontal: 20,
    paddingVertical: 26,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain'
  },
  itemPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PRIMARY[500],
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: GREY[900],
  },
  calculationContainer: {
    marginBottom: 24,
    paddingHorizontal: 26,
  },
  divider: {
    height: 1,
    backgroundColor: GREY[200],
    marginVertical: 0,
  },
  pointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pointLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: GREY[900],
  },
  pointLabelBold: {
    fontWeight: '400',
    color: GREY[900],
  },
  pointValue: {
    fontSize: 14,
    fontWeight: '400',
    color: GREY[900],
  },
  pointDecrease: {
    color: RED[300],
  },
  pointIncrease: {
    color: PRIMARY[500],
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 27,
    paddingTop: 16,
    paddingBottom: 16,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: GREY[200],
  },
  confirmButton: {
    backgroundColor: BLUE.SECONDARY,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: GREY[900],
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: GREY.WHITE,
  },
});
