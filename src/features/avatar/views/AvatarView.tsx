/**
 * 아바타 화면 (메인)
 */

import React, { useCallback } from 'react';
import { ActivityIndicator, Alert, BackHandler, View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { UNITY_PREVIEW } from '../models/avatarConstants';
import { useAvatarViewModel } from '../viewmodels/useAvatarViewModel';
import { AvatarHeader } from './components/AvatarHeader';
import { AvatarPreview } from './components/AvatarPreview';
import { BottomButtons } from './components/BottomButtons';
import { CategoryTabs } from './components/CategoryTabs';
import { HairColorPicker } from './components/HairColorPicker';
import { InsufficientPointsAlert } from './components/InsufficientPointsAlert';
import { ItemsGrid } from './components/ItemsGrid';
import { PurchaseModal } from './components/PurchaseModal';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GREY, PRIMARY, RED } from '~/shared/styles';
import { useAppTranslation } from '~/i18n';
import { useScreenLifetime } from '~/shared/hooks/useScreenLifetime';
import { getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';

interface AvatarViewProps {
  onClose: () => void;
}

/**
 * 아바타 메인 화면
 */
export const AvatarView: React.FC<AvatarViewProps> = ({ onClose }) => {
  return (
    <SafeAreaProvider>
      <AvatarViewContent onClose={onClose} />
    </SafeAreaProvider>
  );
};

/**
 * 아바타 화면 내부 컨텐츠
 */
const AvatarViewContent: React.FC<AvatarViewProps> = ({ onClose }) => {
  const translate = useAppTranslation();
  const viewModel = useAvatarViewModel();
  const insets = useSafeAreaInsets();
  const { cancelChanges } = viewModel;
  const captureLifetime = useScreenLifetime();

  // 뒤로가기 버튼 핸들러: Unity에 원래 상태 복원 후 화면 닫기
  const handleClose = useCallback(() => {
    if (viewModel.isLoading) return;
    if (!viewModel.hasChanges) {
      onClose();
      return;
    }
    const isScreenCurrent = captureLifetime();
    const session = getSessionSnapshot();
    Alert.alert(translate('변경사항을 버릴까요?'), translate('아직 적용하지 않은 변경사항이 있어요.'), [
      { text: translate('계속 꾸미기'), style: 'cancel' },
      { text: translate('버리기'), style: 'destructive', onPress: () => {
        if (!isScreenCurrent() || !isSessionCurrent(session)) return;
        cancelChanges();
        onClose();
      } },
    ]);
  }, [cancelChanges, captureLifetime, onClose, translate, viewModel.hasChanges, viewModel.isLoading]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => subscription.remove();
  }, [handleClose]));

  return (
    <View style={styles.container} testID="avatar-view-root">
      <View style={[styles.safeAreaInset, { height: insets.top }]} />
      {/* Header */}
      <AvatarHeader onClose={handleClose} points={viewModel.totalPoint} />
      {/* Unity Character Preview */}
      <View style={styles.previewRow}>
        <View style={styles.previewSideMask} />
        <AvatarPreview equippedItems={viewModel.previewItems} hairColor={viewModel.pendingHairColor} />
        <View style={styles.previewSideMask} />
      </View>
      <View style={styles.controls} pointerEvents={viewModel.isLoading ? 'none' : 'auto'}>
        {/* Category Tabs */}
        <CategoryTabs
          categories={viewModel.categories}
          selectedIndex={viewModel.selectedCategoryIndex}
          onSelectCategory={viewModel.selectCategory}
        />
      </View>
      <View style={styles.list} pointerEvents={viewModel.isLoading ? 'none' : 'auto'}>
        <ItemsGrid
          key={viewModel.selectedCategory}
          header={viewModel.isHairCategory ? (
            <HairColorPicker
              selectedColor={viewModel.pendingHairColor}
              onSelectColor={viewModel.selectHairColor}
            />
          ) : null}
          footer={<>
            {viewModel.isItemsFetching && <ActivityIndicator color={PRIMARY[600]} />}
            {viewModel.itemsError ? (
              <View style={styles.listStatus}>
                <Text style={styles.message}>{translate('아이템을 불러오지 못했어요.')}</Text>
                <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => viewModel.retryItems()}>
                  <Text style={styles.statusText}>{translate('다시 시도')}</Text>
                </TouchableOpacity>
              </View>
            ) : !viewModel.isItemsLoading && viewModel.currentCategoryItems.length === 0 && (
              <Text style={styles.message}>{translate('아이템이 없어요.')}</Text>
            )}
          </>}
          items={viewModel.currentCategoryItems}
          hairColor={viewModel.pendingHairColor}
          onSelectItem={viewModel.selectItem}
          isItemSelected={viewModel.isItemSelected}
          onEndReached={() => {
            if (viewModel.hasNextPage && !viewModel.isItemsFetching && !viewModel.itemsError) {
              viewModel.fetchNextPage();
            }
          }}
        />
      </View>

      {viewModel.actionError && (
        <Text accessibilityRole="alert" style={styles.error}>{viewModel.actionError}</Text>
      )}
      {/* Bottom Buttons */}
      <BottomButtons
        hasChanges={viewModel.hasChanges}
        shouldShowPurchase={viewModel.shouldShowPurchaseButton}
        totalPurchasePrice={viewModel.totalPurchasePrice}
        selectedItems={viewModel.shouldShowPurchaseButton ? viewModel.itemsToPurchase : viewModel.changedItems}
        hairColor={viewModel.pendingHairColor}
        onSelectItem={item => viewModel.selectCategory(viewModel.categories.findIndex(category => category.type === item.itemType.id))}
        onCancel={cancelChanges}
        onConfirm={viewModel.confirmChanges}
        isLoading={viewModel.isLoading}
      />
      <View style={[styles.safeAreaInset, { height: insets.bottom }]} />

      {/* Purchase Modal */}
      {viewModel.showPurchaseModal && (
        <PurchaseModal
          items={viewModel.itemsToPurchase}
          hairColor={viewModel.pendingHairColor}
          totalPrice={viewModel.totalPurchasePrice}
          currentPoints={viewModel.totalPoint}
          remainingPoints={viewModel.remainingPoints}
          onConfirm={viewModel.confirmPurchase}
          onCancel={() => { if (!viewModel.isLoading) viewModel.setShowPurchaseModal(false); }}
          isLoading={viewModel.isLoading}
        />
      )}

      {/* Insufficient Points Alert */}
      {viewModel.showInsufficientPointsAlert && (
        <InsufficientPointsAlert
          onClose={() => viewModel.setShowInsufficientPointsAlert(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY[900],
  },
  retry: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  listStatus: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  message: {
    color: GREY[600],
    textAlign: 'center',
    paddingVertical: 16,
  },
  error: {
    color: RED[300],
    backgroundColor: GREY[50],
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeAreaInset: {
    backgroundColor: GREY[50],
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: UNITY_PREVIEW.HEIGHT,
    backgroundColor: 'transparent',
  },
  previewSideMask: {
    width: 20,
    backgroundColor: GREY[50],
  },
  controls: {
    backgroundColor: GREY[50],
  },
  list: {
    flex: 1,
    minHeight: 0,
    backgroundColor: GREY[50],
  },
});
