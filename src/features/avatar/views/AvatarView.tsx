/**
 * 아바타 화면 (메인)
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useAvatarViewModel } from '../viewmodels/useAvatarViewModel';
import { AvatarHeader } from './components/AvatarHeader';
import { AvatarPreview } from './components/AvatarPreview';
import { BottomButtons } from './components/BottomButtons';
import { CategoryTabs } from './components/CategoryTabs';
import { InsufficientPointsAlert } from './components/InsufficientPointsAlert';
import { ItemsGrid } from './components/ItemsGrid';
import { PurchaseModal } from './components/PurchaseModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GREY } from '~/shared/styles';

/**
 * 아바타 메인 화면
 */

interface AvatarViewProps {
  onClose: () => void;
}

export const AvatarView: React.FC<AvatarViewProps> = ({ onClose }) => {
  const viewModel = useAvatarViewModel();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container,
      {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }
    ]}>
      {/* Header */}
      <AvatarHeader onClose={onClose} points={viewModel.totalPoint} />
      {/* Unity Character Preview */}
      <AvatarPreview equippedItems={viewModel.previewItems} />

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

        {/* Items Grid */}
        <ItemsGrid
          items={viewModel.currentCategoryItems}
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
        onCancel={viewModel.cancelChanges}
        onConfirm={viewModel.confirmChanges}
        isLoading={viewModel.isLoading}
      />

      {/* Purchase Modal */}
      {viewModel.showPurchaseModal && (
        <PurchaseModal
          items={viewModel.itemsToPurchase}
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
