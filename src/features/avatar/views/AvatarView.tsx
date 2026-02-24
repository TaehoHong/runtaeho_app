/**
 * 아바타 화면 (메인)
 */

import React, { useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
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
import { GREY } from '~/shared/styles';

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
  const viewModel = useAvatarViewModel();
  const insets = useSafeAreaInsets();
  const { cancelChanges } = viewModel;

  // 뒤로가기 버튼 핸들러: Unity에 원래 상태 복원 후 화면 닫기
  const handleClose = useCallback(() => {
    cancelChanges();
    onClose();
  }, [cancelChanges, onClose]);

  return (
    <View style={[
      styles.container,
      {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }
    ]}>
      {/* Header */}
      <AvatarHeader onClose={handleClose} points={viewModel.totalPoint} />
      {/* Unity Character Preview */}
      <AvatarPreview equippedItems={viewModel.previewItems} hairColor={viewModel.pendingHairColor} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Tabs */}
        <CategoryTabs
          categories={viewModel.categories}
          selectedIndex={viewModel.selectedCategoryIndex}
          onSelectCategory={viewModel.selectCategory}
        />

        {/* Hair Color Picker (머리 카테고리일 때만 표시) */}
        {viewModel.isHairCategory && (
          <HairColorPicker
            selectedColor={viewModel.pendingHairColor}
            onSelectColor={viewModel.selectHairColor}
          />
        )}

        {/* Items Grid */}
        <ItemsGrid
          items={viewModel.currentCategoryItems}
          hairColor={viewModel.pendingHairColor}
          onSelectItem={viewModel.selectItem}
          isItemSelected={viewModel.isItemSelected}
          onEndReached={() => {
            if (viewModel.hasNextPage && !viewModel.isLoading) {
              viewModel.fetchNextPage();
            }
          }}
        />
      </ScrollView>

      {/* Bottom Buttons */}
      <BottomButtons
        hasChanges={viewModel.hasChanges}
        shouldShowPurchase={viewModel.shouldShowPurchaseButton}
        onCancel={cancelChanges}
        onConfirm={viewModel.confirmChanges}
        isLoading={viewModel.isLoading}
      />

      {/* Purchase Modal */}
      {viewModel.showPurchaseModal && (
        <PurchaseModal
          items={viewModel.itemsToPurchase}
          hairColor={viewModel.pendingHairColor}
          totalPrice={viewModel.totalPurchasePrice}
          currentPoints={viewModel.totalPoint}
          remainingPoints={viewModel.remainingPoints}
          onConfirm={viewModel.confirmPurchase}
          onCancel={() => viewModel.setShowPurchaseModal(false)}
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
  container: {
    flex: 1,
    backgroundColor: GREY[50],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
