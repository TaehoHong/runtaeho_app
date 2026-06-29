import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SwipeListView } from 'react-native-swipe-list-view';
import { TopScreenSafeAreaView } from '~/shared/components';
import { Text } from '~/shared/components/typography';
import { Icon } from '~/shared/components/ui';
import { GREY, PRIMARY, RED } from '~/shared/styles';
import { RunningStatusFormat } from '~/shared/utils/formatters';
import type { ShoeViewModel } from '../models';
import { useShoeViewModel } from '../viewmodels';
import { AddShoeView } from './AddShoeView';
import { EditShoeView } from './EditShoeView';
import { StoredShoesListView } from './StoredShoesListView';

/**
 * 신발 목록 화면
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
    disableShoe,
    deleteShoe,
    refreshShoes,
  } = useShoeViewModel();

  // UI 전용 로컬 상태
  const [isRefreshing, setIsRefreshing] = useState(false);
  const swipeListRef = useRef<SwipeListView<ShoeViewModel>>(null);
  const [selectedShoe, setSelectedShoe] = useState<ShoeViewModel | null>(null);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStoredShoesView, setShowStoredShoesView] = useState(false);
  const [showAddShoeView, setShowAddShoeView] = useState(false);
  const [showEditShoeView, setShowEditShoeView] = useState(false);

  console.log('👟 [ShoesListView] 렌더링, 신발 개수:', shoeViewModels.length);

  // 열린 스와이프 행 닫기
  const closeOpenRows = () => {
    swipeListRef.current?.closeAllOpenRows();
  };

  // 새로고침
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshShoes();
    setIsRefreshing(false);
  };

  // 대표 신발 설정
  const handleSetMain = async (shoeId: number) => {
    closeOpenRows();
    try {
      await handleSetMainShoe(shoeId);
      console.log('✅ [ShoesListView] 대표 신발 설정 완료:', shoeId);
    } catch (error) {
      console.error('❌ [ShoesListView] 대표 신발 설정 실패:', error);
    }
  };

  // 보관 처리 (isEnabled: false)
  const handleStorage = async (shoe: ShoeViewModel) => {
    closeOpenRows();
    setSelectedShoe(shoe);
    setShowStorageModal(true);
  };

  const confirmStorage = async () => {
    if (!selectedShoe) return;

    try {
      await disableShoe(selectedShoe.id);
      setShowStorageModal(false);
      console.log('✅ [ShoesListView] 신발 보관 완료:', selectedShoe.displayName);
    } catch (error) {
      console.error('❌ [ShoesListView] 신발 보관 실패:', error);
    }
  };

  // 삭제 처리
  const handleDelete = async (shoe: ShoeViewModel) => {
    closeOpenRows();
    setSelectedShoe(shoe);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedShoe) return;

    try {
      await deleteShoe(selectedShoe.id);
      setShowDeleteModal(false);
      console.log('✅ [ShoesListView] 신발 삭제 완료:', selectedShoe.displayName);
    } catch (error) {
      console.error('❌ [ShoesListView] 신발 삭제 실패:', error);
    }
  };

  // 신발 선택 (수정 화면)
  const handleSelectShoe = (shoe: ShoeViewModel) => {
    setSelectedShoe(shoe);
    setShowEditShoeView(true);
  };

  // 활성화된 신발만 필터링
  const activeShoes = shoeViewModels.filter((shoe) => !shoe.isAchieved);

  return (
    <SafeAreaProvider>
      <TopScreenSafeAreaView style={styles.container}>
        {/* 헤더 */}
        <Header onClose={onClose} onAddPress={() => setShowAddShoeView(true)} />

      {/* 메인 컨텐츠 */}
      {isLoading ? (
        <LoadingState />
      ) : (
        <SwipeListView
          ref={swipeListRef}
          data={activeShoes}
          keyExtractor={(item) => `shoe-${item.id}`}
          ListHeaderComponent={
            <>
              {/* 대표 신발 카드 */}
              {mainShoeViewModel && <MainShoeCard shoe={mainShoeViewModel} />}

              {/* 섹션 헤더 */}
              <SectionHeader
                onManageStoragePress={() => setShowStoredShoesView(true)}
              />
            </>
          }
          renderItem={({ item }) => (
            <ShoeCard shoe={item} onPress={() => handleSelectShoe(item)} />
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

      {/* 보관 신발 목록 모달 */}
      {showStoredShoesView && (
        <Modal
          visible={showStoredShoesView}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowStoredShoesView(false)}
        >
          <StoredShoesListView onClose={() => setShowStoredShoesView(false)} />
        </Modal>
      )}

      {/* 신발 추가 모달 */}
      {showAddShoeView && (
        <Modal
          visible={showAddShoeView}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowAddShoeView(false)}
        >
          <AddShoeView
            onClose={() => setShowAddShoeView(false)}
            onSuccess={() => {
              refreshShoes();
            }}
          />
        </Modal>
      )}

      {/* 신발 수정 모달 */}
      {showEditShoeView && selectedShoe && (
        <Modal
          visible={showEditShoeView}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowEditShoeView(false)}
        >
          <EditShoeView
            shoe={selectedShoe}
            onClose={() => setShowEditShoeView(false)}
            onSuccess={() => {
              refreshShoes();
            }}
          />
        </Modal>
      )}
      </TopScreenSafeAreaView>
    </SafeAreaProvider>
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
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}
      <Text style={styles.headerTitle}>내 신발</Text>
      <TouchableOpacity onPress={onAddPress} style={styles.addButton}>
        <Ionicons name="add-circle-outline" size={24} color={GREY[900]} />
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
            {RunningStatusFormat.distance(shoe.totalDistance, { fractionDigits: 1 })}
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
  onPress: () => void;
}

const ShoeCard: React.FC<ShoeCardProps> = ({ shoe, onPress }) => {
  return (
    <TouchableOpacity style={styles.shoeItemContent} onPress={onPress} activeOpacity={1.0}>
      <View style={styles.shoeItemImageContainer}>
        <Icon name="shoe" size={24} />
      </View>
      <View style={styles.shoeItemInfo}>
        <Text style={styles.shoeItemName}>{shoe.displayName}</Text>
        <View style={styles.shoeItemDistance}>
          <Text style={styles.shoeItemDistanceLabel}>누적 거리</Text>
          <Text style={styles.shoeItemDistanceValue}>
            {RunningStatusFormat.distance(shoe.totalDistance, { fractionDigits: 1 })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
      <ActivityIndicator size="large" color={GREY[800]} />
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
    flex: 1,
    backgroundColor: GREY[50],
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
    color: GREY[900],
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
    backgroundColor: GREY.WHITE,
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
    backgroundColor: GREY[50],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  mainShoeImagePlaceholder: {
    fontSize: 10,
    fontWeight: '400',
    color: GREY[700],
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
    color: GREY[500],
    fontFamily: 'Pretendard',
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  mainShoeModel: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY[900],
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
    color: GREY[300],
    fontFamily: 'Pretendard',
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  mainShoeDistanceValue: {
    fontSize: 10,
    fontWeight: '500',
    color: GREY[300],
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
    color: GREY[900],
    fontFamily: 'Pretendard',
    lineHeight: 24,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '500',
    color: GREY[600],
    fontFamily: 'Pretendard',
    lineHeight: 16,
  },

  // ===== 신발 리스트 아이템 =====
  shoeItemContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: GREY.WHITE,
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
    backgroundColor: GREY[50],
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
    color: GREY[900],
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
    color: GREY[300],
    fontFamily: 'Pretendard',
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  shoeItemDistanceValue: {
    fontSize: 10,
    fontWeight: '500',
    color: GREY[300],
    fontFamily: 'Pretendard',
    lineHeight: 14,
    letterSpacing: 0.4,
  },

  // ===== 액션 버튼 =====
  actionButtonMain: {
    width: 57,
    height: 76,
    backgroundColor: PRIMARY[600],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonStorage: {
    width: 57,
    height: 76,
    backgroundColor: GREY[600],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonDelete: {
    width: 57,
    height: 76,
    backgroundColor: RED[400],
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
    color: GREY[300],
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
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 26,
    width: 324,
    gap: 16,
  },
  modalMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: GREY[900],
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
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: PRIMARY[600],
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  modalButtonCancel: {
    backgroundColor: GREY[50],
  },
  modalButtonDelete: {
    backgroundColor: RED[400],
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY.WHITE,
    fontFamily: 'Pretendard',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY[800],
    fontFamily: 'Pretendard',
  },
});
