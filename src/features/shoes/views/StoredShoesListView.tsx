import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Text } from '~/shared/components/typography';
import { Icon } from '~/shared/components/ui';
import { useShoeViewModel } from '../viewmodels';
import type { ShoeViewModel } from '../models';

/**
 * 신발 보관함 화면
 */
interface StoredShoesListViewProps {
  onClose?: () => void;
}

export const StoredShoesListView: React.FC<StoredShoesListViewProps> = ({ onClose }) => {
  const {
    shoeViewModels,
    isLoading,
    enableShoe,
    deleteShoe,
    refreshShoes,
  } = useShoeViewModel();

  // UI 전용 로컬 상태
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedShoe, setSelectedShoe] = useState<ShoeViewModel | null>(null);
  const [showTakeOutModal, setShowTakeOutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  console.log('📦 [StoredShoesListView] 렌더링, 보관 신발 개수:', shoeViewModels.filter(s => s.isAchieved).length);

  // 새로고침
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshShoes();
    setIsRefreshing(false);
  };

  // 꺼내기 처리 (isEnabled: true)
  const handleTakeOut = async (shoe: ShoeViewModel) => {
    setSelectedShoe(shoe);
    setShowTakeOutModal(true);
  };

  const confirmTakeOut = async () => {
    if (!selectedShoe) return;

    try {
      await enableShoe(selectedShoe.id);
      setShowTakeOutModal(false);
      console.log('✅ [StoredShoesListView] 신발 꺼내기 완료:', selectedShoe.displayName);
    } catch (error) {
      console.error('❌ [StoredShoesListView] 신발 꺼내기 실패:', error);
    }
  };

  // 삭제 처리
  const handleDelete = async (shoe: ShoeViewModel) => {
    setSelectedShoe(shoe);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedShoe) return;

    try {
      await deleteShoe(selectedShoe.id);
      setShowDeleteModal(false);
      console.log('✅ [StoredShoesListView] 신발 삭제 완료:', selectedShoe.displayName);
    } catch (error) {
      console.error('❌ [StoredShoesListView] 신발 삭제 실패:', error);
    }
  };

  // 보관된 신발만 필터링 (isAchieved는 !isEnabled와 동일)
  const storedShoes = shoeViewModels.filter((shoe) => shoe.isAchieved);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <Header onClose={onClose} />

      {/* 메인 컨텐츠 */}
      {isLoading ? (
        <LoadingState />
      ) : (
        <SwipeListView
          data={storedShoes}
          keyExtractor={(item) => `stored-shoe-${item.id}`}
          renderItem={({ item }) => <ShoeCard shoe={item} />}
          renderHiddenItem={({ item }) => (
            <HiddenActionButtons
              onTakeOut={() => handleTakeOut(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={
            storedShoes.length === 0 ? styles.emptyListContent : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          rightOpenValue={-120} // 버튼 2개(57*2) + 간격 1개(6) = 120
          disableRightSwipe
          closeOnRowPress
          closeOnScroll
        />
      )}

      {/* 모달들 */}
      <TakeOutConfirmModal
        visible={showTakeOutModal}
        shoeName={selectedShoe?.displayName || ''}
        onConfirm={confirmTakeOut}
        onCancel={() => setShowTakeOutModal(false)}
      />

      <DeleteConfirmModal
        visible={showDeleteModal}
        shoeName={selectedShoe?.displayName || ''}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </SafeAreaView>
  );
};

// ========== 내부 컴포넌트들 ==========

/**
 * 헤더 컴포넌트
 * Figma: 뒤로가기 + "신발 보관함"
 */
interface HeaderProps {
  onClose?: (() => void) | undefined;
}

const Header: React.FC<HeaderProps> = ({ onClose }) => {
  return (
    <View style={styles.header}>
      {onClose ? (
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#2B2B2B" />
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}
      <Text style={styles.headerTitle}>신발 보관함</Text>
      <View style={styles.placeholder} />
    </View>
  );
};

/**
 * 신발 카드 컴포넌트 (보이는 부분)
 */
interface ShoeCardProps {
  shoe: ShoeViewModel;
}

const ShoeCard: React.FC<ShoeCardProps> = ({ shoe }) => {
  return (
    <View style={styles.shoeItemContent}>
      <View style={styles.shoeItemImageContainer}>
        <Icon name="shoe" size={24} />
      </View>
      <View style={styles.shoeItemInfo}>
        <Text style={styles.shoeItemName}>{shoe.displayName}</Text>
        <View style={styles.shoeItemDistance}>
          <Text style={styles.shoeItemDistanceLabel}>누적 거리</Text>
          <Text style={styles.shoeItemDistanceValue}>
            {(shoe.totalDistance / 1000).toFixed(1)}km
          </Text>
        </View>
      </View>
    </View>
  );
};

/**
 * 숨겨진 액션 버튼들 (스와이프 시 노출)
 * Figma: 좌측 스와이프 시 삭제(빨강) + 꺼내기(회색) 버튼
 */
interface HiddenActionButtonsProps {
  onTakeOut: () => void;
  onDelete: () => void;
}

const HiddenActionButtons: React.FC<HiddenActionButtonsProps> = ({
  onTakeOut,
  onDelete,
}) => {
  return (
    <View style={styles.hiddenActionsContainer}>
      <TouchableOpacity style={styles.actionButtonDelete} onPress={onDelete}>
        <Icon name="treshcan" size={24} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButtonTakeOut} onPress={onTakeOut}>
        <Icon name="unpack" size={24} />
      </TouchableOpacity>
    </View>
  );
};

/**
 * 빈 상태
 */
const EmptyState: React.FC = () => {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        보관된 신발이 없어요.{'\n'}신발을 보관하면 여기에 표시됩니다!
      </Text>
    </View>
  );
};

/**
 * 로딩 상태
 */
const LoadingState: React.FC = () => {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#414141" />
    </View>
  );
};

/**
 * 꺼내기 확인 모달
 */
interface TakeOutConfirmModalProps {
  visible: boolean;
  shoeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const TakeOutConfirmModal: React.FC<TakeOutConfirmModalProps> = ({
  visible,
  shoeName,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalMessage}>
            {shoeName} 를{'\n'}신발 보관함에서 꺼내시겠어요?
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={onCancel}
            >
              <Text style={styles.modalButtonCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonConfirm]}
              onPress={onConfirm}
            >
              <Text style={styles.modalButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/**
 * 삭제 확인 모달
 */
interface DeleteConfirmModalProps {
  visible: boolean;
  shoeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  shoeName,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalMessage}>
            신발을 삭제하면 복구할 수 없어요!{'\n'}해당 신발을 영구 삭제 하시겠어요?
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={onCancel}
            >
              <Text style={styles.modalButtonCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonDelete]}
              onPress={onConfirm}
            >
              <Text style={styles.modalButtonText}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ========== 스타일 ==========

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // ===== 헤더 =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    height: 56,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202020',
    fontFamily: 'Pretendard',
    lineHeight: 24,
  },
  placeholder: {
    width: 24,
    height: 24,
  },

  // ===== 신발 리스트 아이템 =====
  shoeItemContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
    height: 76,
    marginBottom: 8,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  hiddenActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 76,
    marginBottom: 8,
    marginRight: 20,
    gap: 6,
  },
  shoeItemImageContainer: {
    width: 52,
    height: 52,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shoeItemInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  shoeItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202020',
    fontFamily: 'Pretendard',
    lineHeight: 18,
  },
  shoeItemDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shoeItemDistanceLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#BCBCBC',
    fontFamily: 'Pretendard',
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  shoeItemDistanceValue: {
    fontSize: 10,
    fontWeight: '500',
    color: '#BCBCBC',
    fontFamily: 'Pretendard',
    lineHeight: 14,
    letterSpacing: 0.4,
  },

  // ===== 액션 버튼 =====
  actionButtonDelete: {
    width: 57,
    height: 76,
    backgroundColor: '#F76F71',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonTakeOut: {
    width: 57,
    height: 76,
    backgroundColor: '#747474',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===== 리스트 =====
  listContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
  },

  // ===== 빈 상태 =====
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#BCBCBC',
    fontFamily: 'Pretendard',
    textAlign: 'center',
    lineHeight: 24,
  },

  // ===== 로딩 상태 =====
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===== 모달 =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 26,
    width: 324,
    gap: 16,
  },
  modalMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#202020',
    fontFamily: 'Pretendard',
    textAlign: 'center',
    lineHeight: 24,
    paddingVertical: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonConfirm: {
    backgroundColor: '#45DA31',
  },
  modalButtonDelete: {
    backgroundColor: '#F76F71',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Pretendard',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#414141',
    fontFamily: 'Pretendard',
  },
});
