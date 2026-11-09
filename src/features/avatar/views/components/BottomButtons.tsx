import { useAppTranslation } from '~/i18n';
/**
 * 하단 버튼 (취소 / 확인 or 구매)
 * SRP: 하단 액션 버튼만 담당
 */

import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCategoryDisplayName, type Item } from '~/features/avatar';
import { resolveAvatarItemImage } from '~/features/avatar/utils/avatarItemImageResolver';
import { BLUE, GREY, PRIMARY } from '~/shared/styles';
import { getNumberFontStyle } from '~/shared/components/typography/fontUtils';

interface Props {
  hasChanges: boolean;
  shouldShowPurchase: boolean;
  totalPurchasePrice?: number;
  selectedItems: readonly Item[];
  hairColor: string;
  onSelectItem: (item: Item) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const BottomButtons: React.FC<Props> = ({
  hasChanges,
  shouldShowPurchase,
  totalPurchasePrice = 0,
  selectedItems,
  hairColor,
  onSelectItem,
  onCancel,
  onConfirm,
  isLoading,
}) => {
  const t = useAppTranslation();
  return (
    <View style={styles.footer}>
      <View style={styles.summary}>
        <View style={styles.selection}>
          <Text style={styles.summaryLabel}>
            {selectedItems.length ? t('선택 {{count}}개', { count: selectedItems.length })
              : hasChanges ? t('색상 변경') : t('현재 착용')}
          </Text>
          {selectedItems.map(item => (
            <TouchableOpacity
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={t('선택한 {{category}} 수정', { category: getCategoryDisplayName(item.itemType.id) })}
              style={styles.selectedItem}
              disabled={isLoading}
              onPress={() => onSelectItem(item)}
            >
              <Image source={resolveAvatarItemImage(item, hairColor)} style={styles.selectedImage} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.total}>
          {shouldShowPurchase && <Text style={styles.summaryLabel}>{t('총 구매 금액')}</Text>}
          <Text style={styles.totalPrice}>
            {shouldShowPurchase ? `${totalPurchasePrice.toLocaleString()} P`
              : hasChanges ? t('추가 비용 없음') : t('적용 완료')}
          </Text>
        </View>
      </View>
      <View style={styles.container}>
        {/* Cancel Button */}
        <TouchableOpacity
          style={[
            styles.button,
            styles.cancelButton,
            !hasChanges && styles.buttonDisabled,
          ]}
          onPress={onCancel}
          accessibilityRole="button"
          disabled={!hasChanges || isLoading}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.buttonText,
              !hasChanges && styles.buttonTextDisabled,
            ]}
          >{t('되돌리기')}</Text>
        </TouchableOpacity>

        {/* Confirm / Purchase Button */}
        <TouchableOpacity
          style={[
            styles.button,
            shouldShowPurchase ? styles.purchaseButton : styles.confirmButton,
            !hasChanges && styles.buttonDisabled,
          ]}
          onPress={onConfirm}
          accessibilityRole="button"
          accessibilityLabel={shouldShowPurchase ? t('구매 후 적용') : t('적용')}
          accessibilityState={{ busy: isLoading }}
          disabled={!hasChanges || isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color={GREY[900]} />
          ) : (
            <Text
              style={[
                styles.buttonText,
                !hasChanges && styles.buttonTextDisabled,
              ]}
            >
              {shouldShowPurchase ? t('구매 후 적용') : t('적용')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: GREY[50],
    borderTopWidth: 1,
    borderTopColor: GREY[200],
  },
  summary: {
    paddingHorizontal: 20,
    minHeight: 48,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 8,
  },
  selection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
  },
  summaryLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: GREY[700],
  },
  selectedItem: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  total: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 'auto',
    gap: 8,
  },
  totalPrice: {
    fontSize: 16,
    lineHeight: 24,
    ...getNumberFontStyle('700'),
    color: GREY[900],
  },
  container: {
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: GREY[50],
  },
  button: {
    flex: 1,
    minHeight: 56,
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: GREY[200],
  },
  confirmButton: {
    backgroundColor: PRIMARY[500],
  },
  purchaseButton: {
    backgroundColor: BLUE.SECONDARY,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: GREY[900],
  },
  buttonTextDisabled: {
    color: GREY[500],
  },
});
