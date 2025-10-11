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
 * 신발 목록 화면
 * Figma: #4_마이페이지_내 신발
 * MVVM 아키텍처: View는 ShoeViewModel만 참조
 */
interface ShoesListViewProps {
  onClose?: () => void;
}

export const ShoesListView: React.FC<ShoesListViewProps> = ({ onClose }) => {
  const {
    mainShoeViewModel,
    shoeViewModels,
    isLoading,
    handleSetMainShoe,
    handleToggleShoeEnabled,
    handleDeleteShoe,
    refreshShoes,
  } = useShoeViewModel();

  // UI 전용 로컬 상태
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [swipedShoeId, setSwipedShoeId] = useState<number | null>(null);
  const [selectedShoe, setSelectedShoe] = useState<ShoeViewModel | null>(null);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  console.log('👟 [ShoesListView] 렌더링, 신발 개수:', shoeViewModels.length);

  // 새로고침
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshShoes();
    setIsRefreshing(false);
  };

  // 대표 신발 설정
  const handleSetMain = async (shoeId: number) => {
    try {
      await handleSetMainShoe(shoeId);
      setSwipedShoeId(null);
      console.log('✅ [ShoesListView] 대표 신발 설정 완료:', shoeId);
    } catch (error) {
      console.error('❌ [ShoesListView] 대표 신발 설정 실패:', error);
    }
  };

  // 보관 처리 (isEnabled: false)
  const handleStorage = async (shoe: ShoeViewModel) => {
    setSelectedShoe(shoe);
    setShowStorageModal(true);
  };

  const confirmStorage = async () => {
    if (!selectedShoe) return;

    try {
      await handleToggleShoeEnabled(selectedShoe.id, false);
      setShowStorageModal(false);
      setSwipedShoeId(null);
      console.log('✅ [ShoesListView] 신발 보관 완료:', selectedShoe.displayName);
    } catch (error) {
      console.error('❌ [ShoesListView] 신발 보관 실패:', error);
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
      await handleDeleteShoe(selectedShoe.id);
      setShowDeleteModal(false);
      setSwipedShoeId(null);
      console.log('✅ [ShoesListView] 신발 삭제 완료:', selectedShoe.displayName);
    } catch (error) {
      console.error('❌ [ShoesListView] 신발 삭제 실패:', error);
    }
  };

  // 활성화된 신발만 필터링
  const activeShoes = shoeViewModels.filter((shoe) => !shoe.isAchieved);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <Header onClose={onClose} onAddPress={() => console.log('신발 추가')} />

      {/* 메인 컨텐츠 */}
      {isLoading ? (
        <LoadingState />
      ) : (
        <SwipeListView
          data={activeShoes}
          keyExtractor={(item) => `shoe-${item.id}`}
          ListHeaderComponent={
            <>
              {/* 대표 신발 카드 */}
              {mainShoeViewModel && <MainShoeCard shoe={mainShoeViewModel} />}

              {/* 섹션 헤더 */}
              <SectionHeader
                onManageStoragePress={() => console.log('보관 신발 관리')}
              />
            </>
          }
          renderItem={({ item }) => (
            <ShoeCard shoe={item} />
          )}
          renderHiddenItem={({ item }) => (
            <HiddenActionButtons
              onSetMain={() => handleSetMain(item.id)}
              onStorage={() => handleStorage(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={
            activeShoes.length === 0 ? styles.emptyListContent : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          rightOpenValue={-183} // 버튼 3개(57*3) + 간격 2개(6*2) = 183
          disableRightSwipe
          closeOnRowPress
          closeOnScroll
          onRowOpen={(rowKey) => {
            const shoeId = parseInt(rowKey.replace('shoe-', ''));
            setSwipedShoeId(shoeId);
          }}
          onRowClose={() => setSwipedShoeId(null)}
        />
      )}

      {/* 모달들 */}
      <StorageConfirmModal
        visible={showStorageModal}
        shoeName={selectedShoe?.displayName || ''}
        onConfirm={confirmStorage}
        onCancel={() => setShowStorageModal(false)}
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
 * Figma: 뒤로가기 + "내 신발" + 추가 버튼
 */
interface HeaderProps {
  onClose?: (() => void) | undefined;
  onAddPress: () => void;
}

const Header: React.FC<HeaderProps> = ({ onClose, onAddPress }) => {
  return (
    <View style={styles.header}>
      {onClose ? (
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#2B2B2B" />
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}
      <Text style={styles.headerTitle}>내 신발</Text>
      <TouchableOpacity onPress={onAddPress} style={styles.addButton}>
        <Ionicons name="add-circle-outline" size={24} color="#2B2B2B" />
      </TouchableOpacity>
    </View>
  );
};

/**
 * 대표 신발 카드
 * Figma: 상단 큰 카드 (이미지 + 브랜드/모델 + 누적 거리)
 */
interface MainShoeCardProps {
  shoe: ShoeViewModel;
}

const MainShoeCard: React.FC<MainShoeCardProps> = ({ shoe }) => {
  return (
    <View style={styles.mainShoeCard}>
      {/* 이미지 영역 */}
      <View style={styles.mainShoeImageContainer}>
        <Icon name="shoe" size={41} />
        <Text style={styles.mainShoeImagePlaceholder}>Image Coming Soon</Text>
      </View>

      {/* 정보 영역 */}
      <View style={styles.mainShoeInfo}>
        <Text style={styles.mainShoeBrand}>{shoe.brand}</Text>
        <Text style={styles.mainShoeModel}>{shoe.model}</Text>
        <View style={styles.mainShoeDistance}>
          <Text style={styles.mainShoeDistanceLabel}>누적 거리</Text>
          <Text style={styles.mainShoeDistanceValue}>
            {(shoe.totalDistance / 1000).toFixed(1)}km
          </Text>
        </View>
      </View>
    </View>
  );
};

/**
 * 섹션 헤더
 * Figma: "보유 신발 목록" + "보관 신발 관리"
 */
interface SectionHeaderProps {
  onManageStoragePress: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ onManageStoragePress }) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>보유 신발 목록</Text>
      <TouchableOpacity onPress={onManageStoragePress}>
        <Text style={styles.sectionLink}>보관 신발 관리</Text>
      </TouchableOpacity>
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
 */
interface HiddenActionButtonsProps {
  onSetMain: () => void;
  onStorage: () => void;
  onDelete: () => void;
}

const HiddenActionButtons: React.FC<HiddenActionButtonsProps> = ({
  onSetMain,
  onStorage,
  onDelete,
}) => {
  return (
    <View style={styles.hiddenActionsContainer}>
      <TouchableOpacity style={styles.actionButtonMain} onPress={onSetMain}>
        <Icon name="confirm" size={24} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButtonStorage} onPress={onStorage}>
        <Icon name="store" size={24} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButtonDelete} onPress={onDelete}>
        <Icon name="treshcan" size={24} />
      </TouchableOpacity>
    </View>
  );
};


/**
 * 빈 상태
 * Figma: "보유한 신발이 없어요. 상단 버튼을 통해 신발을 추가해보세요!"
 */
const EmptyState: React.FC = () => {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        보유한 신발이 없어요.{'\n'}상단 버튼을 통해 신발을 추가해보세요!
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
 * 보관 확인 모달
 * Figma: "Adidas Ultraboost 22 를 신발 보관함에 보관했어요!"
 */
interface StorageConfirmModalProps {
  visible: boolean;
  shoeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const StorageConfirmModal: React.FC<StorageConfirmModalProps> = ({
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
            {shoeName} 를{'\n'}신발 보관함에 보관했어요!
          </Text>
          <TouchableOpacity style={styles.modalButton} onPress={onConfirm}>
            <Text style={styles.modalButtonText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/**
 * 삭제 확인 모달
 * Figma: "신발을 삭제하면 복구할 수 없어요! 해당 신발을 영구 삭제 하시겠어요?"
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
  addButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  // ===== 대표 신발 카드 =====
  mainShoeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 0,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  mainShoeImageContainer: {
    width: 130,
    height: 81,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  mainShoeImagePlaceholder: {
    fontSize: 10,
    fontWeight: '400',
    color: '#606060',
    fontFamily: 'Pretendard',
    lineHeight: 18,
  },
  mainShoeInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  mainShoeBrand: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9D9D9D',
    fontFamily: 'Pretendard',
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  mainShoeModel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202020',
    fontFamily: 'Pretendard',
    lineHeight: 18,
  },
  mainShoeDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 0,
  },
  mainShoeDistanceLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#BCBCBC',
    fontFamily: 'Pretendard',
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  mainShoeDistanceValue: {
    fontSize: 10,
    fontWeight: '500',
    color: '#BCBCBC',
    fontFamily: 'Pretendard',
    lineHeight: 14,
    letterSpacing: 0.4,
  },

  // ===== 섹션 헤더 =====
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202020',
    fontFamily: 'Pretendard',
    lineHeight: 24,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '500',
    color: '#747474',
    fontFamily: 'Pretendard',
    lineHeight: 16,
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
  actionButtonMain: {
    width: 57,
    height: 76,
    backgroundColor: '#45DA31',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonStorage: {
    width: 57,
    height: 76,
    backgroundColor: '#747474',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonDelete: {
    width: 57,
    height: 76,
    backgroundColor: '#F76F71',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===== 리스트 =====
  listContent: {
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
    flexDirection: "row",
    width: 292,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#45da31",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 14
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
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
