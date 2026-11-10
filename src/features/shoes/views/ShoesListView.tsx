import { useAppLanguage, useAppTranslation } from '~/i18n';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Animated,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
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
const SWIPE_ACTIONS_WIDTH = 183; // 세 버튼과 두 간격

interface ShoesListViewProps {
  onClose?: () => void;
}

export const ShoesListView: React.FC<ShoesListViewProps> = ({ onClose }) => {
  useAppLanguage();
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
  const [openShoeKey, setOpenShoeKey] = useState<string | null>(null);
  const swipeListRef = useRef<SwipeListView<ShoeViewModel>>(null);
  const [selectedShoe, setSelectedShoe] = useState<ShoeViewModel | null>(null);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStoredShoesView, setShowStoredShoesView] = useState(false);
  const [showAddShoeView, setShowAddShoeView] = useState(false);
  const [showEditShoeView, setShowEditShoeView] = useState(false);

  console.log('👟 [ShoesListView] 렌더링, 신발 개수:', shoeViewModels.length);

  useEffect(() => {
    if (isLoading) setOpenShoeKey(null);
  }, [isLoading]);

  useFocusEffect(useCallback(() => {
    setOpenShoeKey(null);
    swipeListRef.current?.closeAllOpenRows();
  }, []));

  // 열린 스와이프 행 닫기
  const closeOpenRows = () => {
    setOpenShoeKey(null);
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
            <ShoeCard shoe={item} isOpen={openShoeKey === `shoe-${item.id}`} onPress={() => handleSelectShoe(item)} />
          )}
          renderHiddenItem={({ item }) => (
            <HiddenActionButtons
              onSetMain={() => handleSetMain(item.id)}
              onStorage={() => handleStorage(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListEmptyComponent={<EmptyState onAddPress={() => setShowAddShoeView(true)} />}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={
            activeShoes.length === 0 ? styles.emptyListContent : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          rightOpenValue={-SWIPE_ACTIONS_WIDTH}
          onRowOpen={(key) => setOpenShoeKey(String(key))}
          onRowClose={(key) => setOpenShoeKey((current) => current === String(key) ? null : current)}
          recalculateHiddenLayout
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
  const t = useAppTranslation();
  return (
    <View style={styles.header}>
      {onClose ? (
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}
      <Text style={styles.headerTitle}>{t("내 신발")}</Text>
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
  const t = useAppTranslation();
  return (
    <View style={styles.mainShoeCard}>
      {/* 이미지 영역 */}
      <View style={styles.mainShoeImageContainer}>
        <Icon name="shoe" size={41} />
      </View>

      {/* 정보 영역 */}
      <View style={styles.mainShoeInfo}>
        <Text style={styles.mainShoeBrand}>{shoe.brand}</Text>
        <Text style={styles.mainShoeModel}>{shoe.model}</Text>
        <View style={styles.mainShoeDistance}>
          <Text style={styles.mainShoeDistanceLabel}>{t("누적 거리")}</Text>
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
  const t = useAppTranslation();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{t("보유 신발 목록")}</Text>
      <TouchableOpacity onPress={onManageStoragePress}>
        <Text style={styles.sectionLink}>{t("보관 신발 관리")}</Text>
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
  isOpen: boolean;
  swipeAnimatedValue?: Animated.Value;
}

const ShoeCard: React.FC<ShoeCardProps> = ({ shoe, onPress, isOpen, swipeAnimatedValue }) => {
  useAppLanguage();
  const { width } = useWindowDimensions();
  return (
    <TouchableOpacity style={styles.shoeItemContent} onPress={onPress} activeOpacity={1.0}>
      <Animated.View style={[styles.shoeItemInner, {
        width: width - 64 - (isOpen ? SWIPE_ACTIONS_WIDTH : 0),
        transform: [{ translateX: swipeAnimatedValue?.interpolate({
          inputRange: [-SWIPE_ACTIONS_WIDTH, 0], outputRange: [SWIPE_ACTIONS_WIDTH, 0], extrapolate: 'clamp',
        }) ?? 0 }],
      }]}>
      {!isOpen && (
        <View style={styles.shoeItemImageContainer}>
          <Icon name="shoe" size={24} />
        </View>
      )}
      <View style={styles.shoeItemInfo}>
        <Text style={styles.shoeItemName} numberOfLines={2} ellipsizeMode="tail" adjustsFontSizeToFit={isOpen} minimumFontScale={0.5}>{shoe.displayName}</Text>
        <View style={styles.shoeItemDistance}>
          <Text style={styles.shoeItemDistanceValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            {RunningStatusFormat.distance(shoe.totalDistance, { fractionDigits: 1 })}
          </Text>
        </View>
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

/**
 * 숨겨진 액션 버튼들 (스와이프 시 노출)
 */
interface HiddenActionButtonsProps {
  swipeAnimatedValue?: Animated.Value;
  onSetMain: () => void;
  onStorage: () => void;
  onDelete: () => void;
}

const HiddenActionButtons: React.FC<HiddenActionButtonsProps> = ({
  swipeAnimatedValue,
  onSetMain,
  onStorage,
  onDelete,
}) => {
  useAppLanguage();
  return (
    <Animated.View style={[styles.hiddenActionsContainer, {
      opacity: swipeAnimatedValue?.interpolate({
        inputRange: [-1, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }) ?? 0,
    }]}>
      <TouchableOpacity style={styles.actionButtonMain} onPress={onSetMain}>
        <Icon name="confirm" size={24} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButtonStorage} onPress={onStorage}>
        <Icon name="store" size={24} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButtonDelete} onPress={onDelete}>
        <Icon name="treshcan" size={24} />
      </TouchableOpacity>
    </Animated.View>
  );
};


/**
 * 빈 상태
 */
const EmptyState: React.FC<{ onAddPress: () => void }> = ({ onAddPress }) => {
  const t = useAppTranslation();
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{t("보유한 신발이 없어요.")}</Text>
      <TouchableOpacity style={styles.emptyAddButton} onPress={onAddPress} accessibilityRole="button">
        <Text style={styles.emptyAddButtonText}>{t("신발 추가")}</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * 로딩 상태
 */
const LoadingState: React.FC = () => {
  useAppLanguage();
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={GREY[800]} />
    </View>
  );
};

/**
 * 보관 확인 모달
 * 확인 후 보관하며, 취소 시 신발 상태를 유지한다.
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
  const t = useAppTranslation();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const stackButtons = fontScale > 1.3;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.modalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalMessageContent} bounces={false}>
            <Text style={[styles.modalMessage, styles.modalMessageCompact]}>{shoeName}</Text>
            <Text style={[styles.modalMessage, styles.modalMessageCompact]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} lineBreakStrategyIOS="standard">{t("신발 보관함에 보관할까요?")}</Text>
          </ScrollView>
          <View style={[styles.modalButtons, stackButtons && styles.modalButtonsStacked]}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonFlex, styles.modalButtonCancel, stackButtons && styles.modalButtonStacked]}
              onPress={onCancel}
            >
              <Text style={styles.modalButtonCancelText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t("취소")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonFlex, stackButtons && styles.modalButtonStacked]}
              onPress={onConfirm}
            >
              <Text style={styles.modalButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t("확인")}</Text>
            </TouchableOpacity>
          </View>
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
  const t = useAppTranslation();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const stackButtons = fontScale > 1.3;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.modalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalBody} bounces={false}>
            <Text style={styles.modalMessage} lineBreakStrategyIOS="hangul-word">{shoeName}{'\n'}{t("신발을 삭제하면 복구할 수 없어요!")}{'\n'}{t("해당 신발을 영구 삭제 하시겠어요?")}</Text>
          </ScrollView>
          <View style={[styles.modalButtons, stackButtons && styles.modalButtonsStacked]}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonFlex, styles.modalButtonCancel, stackButtons && styles.modalButtonStacked]}
              onPress={onCancel}
            >
              <Text style={styles.modalButtonCancelText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t("취소")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonFlex, styles.modalButtonDelete, stackButtons && styles.modalButtonStacked]}
              onPress={onConfirm}
            >
              <Text style={styles.modalButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t("삭제")}</Text>
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
    minHeight: 56,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
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
    minHeight: 81,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    backgroundColor: GREY[50],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
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
    flexWrap: 'wrap',
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
    flexWrap: 'wrap',
    gap: 4,
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
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: GREY.WHITE,
    minHeight: 76,
    marginBottom: 8,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  shoeItemInner: {
    flexDirection: 'row',
    gap: 12,
  },
  hiddenActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  shoeItemDistanceValue: {
    flexShrink: 1,
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
    height: '100%',
    backgroundColor: PRIMARY[600],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonStorage: {
    width: 57,
    height: '100%',
    backgroundColor: GREY[600],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonDelete: {
    width: 57,
    height: '100%',
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
  emptyAddButton: {
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: PRIMARY[600],
    justifyContent: 'center',
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: GREY.WHITE,
  },
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
    maxHeight: '100%',
    gap: 16,
  },
  modalBody: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 1,
  },
  modalMessageContent: {
    paddingVertical: 12,
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
  modalMessageCompact: {
    paddingVertical: 0,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalButtonsStacked: {
    flexDirection: 'column',
  },
  modalButton: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: PRIMARY[600],
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  modalButtonFlex: {
    flex: 1,
  },
  modalButtonStacked: {
    flex: 0,
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
