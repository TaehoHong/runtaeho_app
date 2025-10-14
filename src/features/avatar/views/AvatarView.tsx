/**
 * 아바타 화면 (메인)
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AVATAR_COLORS } from '~/features/avatar';
import { useAvatarViewModel } from '../viewmodels/useAvatarViewModel';
import { AvatarHeader } from './components/AvatarHeader';
import { AvatarPreview } from './components/AvatarPreview';
import { BottomButtons } from './components/BottomButtons';
import { CategoryTabs } from './components/CategoryTabs';
import { InsufficientPointsAlert } from './components/InsufficientPointsAlert';
import { ItemsGrid } from './components/ItemsGrid';
import { PurchaseModal } from './components/PurchaseModal';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * 아바타 메인 화면
 */

interface AvatarViewProps {
  onClose: () => void;
}

export const AvatarView: React.FC<AvatarViewProps> = ({ onClose }) => {
  const viewModel = useAvatarViewModel();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <AvatarHeader onClose={onClose} points={viewModel.totalPoint} />
      {/* Unity Character Preview */}
      <AvatarPreview equippedItems={viewModel.previewItems} />
      
      <ScrollView
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AVATAR_COLORS.SCREEN_BACKGROUND,
  },
  content: {
    padding: 20,
  },
});
