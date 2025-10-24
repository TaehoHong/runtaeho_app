import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '~/shared/components/typography';
import { Icon } from '~/shared/components/ui';
import { GREY, PRIMARY, RED } from '~/shared/styles';
import { useUserStore } from '~/stores/user/userStore';
import { PointFilter, PointFilterConfig, type PointHistoryViewModel } from '../models';
import { usePointViewModel } from '../viewmodels';


interface PointHistoryViewProps {
  onClose: () => void;
}

export const PointHistoryView: React.FC<PointHistoryViewProps> = ({ onClose }) => {
  const {
    selectedFilter,
    currentPoints = useUserStore((state) => state.totalPoint),
    filteredPointHistory,
    isLoading,
    isLoadingMore,
    hasMoreData,
    selectFilter,
    refreshPointHistory,
    loadMoreHistories,
  } = usePointViewModel();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  console.log('📊 [PointHistoryView] 렌더링, 필터:', selectedFilter, '내역 개수:', filteredPointHistory.length);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPointHistory();
    setIsRefreshing(false);
  };

  const handleLoadMore = () => {
    if (hasMoreData && !isLoadingMore) {
      console.log('📊 [PointHistoryView] 더 불러오기');
      loadMoreHistories();
    }
  };

  console.log('point: ', currentPoints)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <Header onClose={onClose} />

      {/* 현재 보유 포인트 */}
      <CurrentPointCard points={currentPoints} />

      {/* 포인트 내역 섹션 */}
      <View style={styles.historySection}>
        {/* 타이틀 + 필터 탭 */}
        <View style={styles.historySectionHeader}>
          <Text style={styles.historyTitle}>포인트 내역</Text>
          <FilterTabs selected={selectedFilter} onSelect={selectFilter} />
        </View>

        {/* 내역 리스트 */}
        {isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            data={filteredPointHistory}
            keyExtractor={(item) => `point-history-${item.id}`}
            renderItem={({ item }) => <HistoryItem history={item} />}
            ListEmptyComponent={<EmptyState />}
            ListFooterComponent={
              isLoadingMore ? <ActivityIndicator style={styles.loadingMore} /> : null
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={
              filteredPointHistory.length === 0 ? styles.emptyListContent : styles.listContent
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

// ========== 내부 컴포넌트들 ==========

/**
 * 헤더 컴포넌트
 * Figma: 뒤로가기 버튼 + "포인트" 타이틀
 */
interface HeaderProps {
  onClose: () => void;
}

const Header: React.FC<HeaderProps> = ({ onClose }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onClose} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={GREY[900]} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>포인트</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
};

/**
 * 현재 보유 포인트 카드
 * Figma: 중앙 정렬, 아이콘 + 포인트 표시
 */
interface CurrentPointCardProps {
  points: number;
}

const CurrentPointCard: React.FC<CurrentPointCardProps> = ({ points }) => {
  return (
    <View style={styles.pointCard}>
      <Text style={styles.pointCardLabel}>현재 보유 포인트</Text>
      <View style={styles.pointCardValue}>
        <Icon name="point" size={24} />
        <Text style={styles.pointCardText}>{points.toLocaleString()} P</Text>
      </View>
    </View>
  );
};

/**
 * 필터 탭 컴포넌트
 * Figma: 전체/적립/사용 탭
 */
interface FilterTabsProps {
  selected: PointFilter;
  onSelect: (filter: PointFilter) => void;
}

const FilterTabs: React.FC<FilterTabsProps> = ({ selected, onSelect }) => {
  const filters = [PointFilter.ALL, PointFilter.EARNED, PointFilter.SPENT];

  return (
    <View style={styles.filterTabs}>
      {filters.map((filter) => {
        const isSelected = selected === filter;
        const config = PointFilterConfig[filter];

        return (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, isSelected && styles.filterTabSelected]}
            onPress={() => onSelect(filter)}
          >
            <Text style={[styles.filterTabText, isSelected && styles.filterTabTextSelected]}>
              {config.displayName}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/**
 * 개별 내역 아이템
 * Figma: 좌측(제목+날짜), 우측(포인트)
 */
interface HistoryItemProps {
  history: PointHistoryViewModel;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ history }) => {
  const pointColor = history.isPositive ? styles.pointPositive : styles.pointNegative;

  return (
    <View style={styles.historyItem}>
      <View style={styles.historyItemLeft}>
        <Text style={styles.historyItemTitle}>{history.title}</Text>
        <Text style={styles.historyItemDate}>{history.formattedDate}</Text>
      </View>
      <Text style={[styles.historyItemPoint, pointColor]}>{history.formattedPoint}</Text>
    </View>
  );
};

/**
 * 빈 상태 컴포넌트
 * Figma: "포인트 내역이 없습니다."
 */
const EmptyState: React.FC = () => {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>포인트 내역이 없습니다.</Text>
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
    paddingVertical: 12,
    backgroundColor: GREY.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: GREY[100],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GREY[900],
    fontFamily: 'Pretendard',
  },
  headerSpacer: {
    width: 40, // 뒤로가기 버튼과 대칭
  },

  // ===== 현재 보유 포인트 카드 =====
  pointCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: GREY.WHITE,
    marginBottom: 8,
  },
  pointCardLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: GREY[500],
    fontFamily: 'Pretendard',
    marginBottom: 8,
  },
  pointCardValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointCardText: {
    fontSize: 28,
    fontWeight: '700',
    color: GREY[900],
    fontFamily: 'Pretendard',
  },

  // ===== 포인트 내역 섹션 =====
  historySection: {
    flex: 1,
    backgroundColor: GREY.WHITE,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  historySectionHeader: {
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GREY[900],
    fontFamily: 'Pretendard',
    marginBottom: 12,
  },

  // ===== 필터 탭 =====
  filterTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 13,
    backgroundColor: GREY[50],
  },
  filterTabSelected: {
    backgroundColor: GREY[900],
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: GREY[800],
    fontFamily: 'Pretendard',
  },
  filterTabTextSelected: {
    color: GREY.WHITE,
  },

  // ===== 내역 리스트 =====
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: GREY[50],
  },
  historyItemLeft: {
    flex: 1,
    gap: 6,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: GREY[800],
    fontFamily: 'Pretendard',
  },
  historyItemDate: {
    fontSize: 12,
    fontWeight: '400',
    color: GREY[500],
    fontFamily: 'Pretendard',
  },
  historyItemPoint: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    marginLeft: 12,
  },
  pointPositive: {
    color: PRIMARY[700], // 녹색 (적립)
  },
  pointNegative: {
    color: RED[400], // 빨간색 (사용)
  },

  // ===== 빈 상태 =====
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '400',
    color: GREY[500],
    fontFamily: 'Pretendard',
  },

  // ===== 로딩 상태 =====
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingMore: {
    paddingVertical: 20,
  },
});
