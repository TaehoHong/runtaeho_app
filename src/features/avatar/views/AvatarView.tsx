/**
 * 아바타 화면 (메인)
 */

import React, { useCallback } from 'react';
import { ActivityIndicator, View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
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
    if (viewModel.isLoading) return;
    cancelChanges();
    onClose();
  }, [cancelChanges, onClose, viewModel.isLoading]);

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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        pointerEvents={viewModel.isLoading ? 'none' : 'auto'}
      >
        <View style={styles.filters}>
          {(['owned', 'all'] as const).map(filter => (
            <TouchableOpacity
              key={filter}
              accessibilityRole="tab"
              accessibilityState={{ selected: viewModel.ownershipFilter === filter }}
              style={[styles.filter, viewModel.ownershipFilter === filter && styles.filterSelected]}
              onPress={() => viewModel.selectOwnershipFilter(filter)}
            >
              <Text style={styles.filterText}>{filter === 'owned' ? '보유' : '전체'}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
            if (viewModel.hasNextPage && !viewModel.isItemsFetching && !viewModel.itemsError) {
              viewModel.fetchNextPage();
            }
          }}
        />
        {viewModel.isItemsFetching && <ActivityIndicator color={PRIMARY[600]} />}
        {viewModel.itemsError ? (
          <View style={styles.listStatus}>
            <Text style={styles.message}>아이템을 불러오지 못했어요.</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => viewModel.retryItems()}>
              <Text style={styles.filterText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : !viewModel.isItemsLoading && viewModel.currentCategoryItems.length === 0 && (
          <Text style={styles.message}>
            {viewModel.ownershipFilter === 'owned' ? '보유한 아이템이 없어요. 전체에서 둘러보세요.' : '아이템이 없어요.'}
          </Text>
        )}
        {viewModel.hasNextPage && !viewModel.itemsError && (
          <TouchableOpacity
            accessibilityRole="button"
            disabled={viewModel.isItemsFetching}
            style={styles.listStatus}
            onPress={() => viewModel.fetchNextPage()}
          >
            <Text style={styles.filterText}>더 보기</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {viewModel.actionError && (
        <Text accessibilityRole="alert" style={styles.error}>{viewModel.actionError}</Text>
      )}
      {/* Bottom Buttons */}
      <BottomButtons
        hasChanges={viewModel.hasChanges}
        shouldShowPurchase={viewModel.shouldShowPurchaseButton}
        totalPurchasePrice={viewModel.totalPurchasePrice}
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
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  filter: {
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: GREY[200],
  },
  filterSelected: {
    backgroundColor: PRIMARY[500],
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY[900],
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
  scrollView: {
    flex: 1,
    backgroundColor: GREY[50],
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
