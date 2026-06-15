import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type Region,
} from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '~/shared/components/typography';
import { Icon } from '~/shared/components/ui';
import { GREY, PRIMARY } from '~/shared/styles';
import { formatRecordDate } from '~/shared/utils/dateUtils';
import { formatPaceForUI } from '~/shared/utils/formatters';
import { useShareStore } from '~/features/share/stores/shareStore';
import { useShareEntryTransitionStore } from '~/features/share/stores/shareEntryTransitionStore';
import type { Shoe } from '~/features/shoes/models';
import { useShoeViewModel } from '~/features/shoes/viewmodels';
import {
  getRouteCoordinates,
  getRouteRegion,
  runningRecordItemsToLocations,
} from '~/features/share/utils/routeLocations';
import type { Location, RunningRecord } from '../models';
import { calculateAveragePace } from '../models';
import {
  useGetRunningRecord,
  useGetRunningRecordItems,
  useUpdateRunningRecordShoe,
} from '../services/runningQueries';
import { ShoeSnapCarousel } from './shoe-selection-area';

const HEADER_BAR_HEIGHT = 52;
const MAP_HERO_HEIGHT = 350;

interface MapRenderBoundaryState {
  hasError: boolean;
}

class MapRenderBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  MapRenderBoundaryState
> {
  state: MapRenderBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapRenderBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    console.warn('[RunningRecordDetailView] Map render failed');
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

export const RunningRecordDetailView: React.FC = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const recordId = Number(params.id);
  const isValidRecordId = Number.isInteger(recordId) && recordId > 0;
  const [mapRenderFailed, setMapRenderFailed] = useState(false);
  const [isShoeSheetVisible, setIsShoeSheetVisible] = useState(false);
  const [selectedSheetShoeId, setSelectedSheetShoeId] = useState<number | null>(null);

  const recordQuery = useGetRunningRecord(recordId, { enabled: isValidRecordId });
  const itemsQuery = useGetRunningRecordItems(recordId, { enabled: isValidRecordId });
  const {
    shoes,
    isLoadingShoes,
    hasError: hasShoeError,
  } = useShoeViewModel();
  const {
    mutateAsync: updateRunningRecordShoe,
    isPending: isUpdatingRecordShoe,
    isError: isUpdateShoeError,
    reset: resetUpdateShoe,
  } = useUpdateRunningRecordShoe();

  useEffect(() => {
    setMapRenderFailed(false);
  }, [recordId]);

  const routeLocations = useMemo(() => {
    if (!itemsQuery.isSuccess) {
      return [];
    }

    return runningRecordItemsToLocations(itemsQuery.data);
  }, [itemsQuery.data, itemsQuery.isSuccess]);

  const showFailure = !isValidRecordId || recordQuery.isError;
  const record = recordQuery.data;
  const showMap = itemsQuery.isSuccess && routeLocations.length >= 2 && !mapRenderFailed;
  const currentShoeId = record?.shoeId ?? record?.connectedShoe?.id ?? null;
  const activeShoes = useMemo(() => {
    return shoes.filter((shoe) => shoe.isEnabled);
  }, [shoes]);

  const handleOpenShoeSheet = useCallback(() => {
    if (!record) {
      return;
    }

    resetUpdateShoe();
    setSelectedSheetShoeId(record.shoeId ?? record.connectedShoe?.id ?? null);
    setIsShoeSheetVisible(true);
  }, [record, resetUpdateShoe]);

  const handleCloseShoeSheet = useCallback(() => {
    if (isUpdatingRecordShoe) {
      return;
    }

    setIsShoeSheetVisible(false);
  }, [isUpdatingRecordShoe]);

  const handleSelectSheetShoe = useCallback((shoeId: number) => {
    resetUpdateShoe();
    setSelectedSheetShoeId(shoeId);
  }, [resetUpdateShoe]);

  const handleSaveShoeChange = useCallback(async () => {
    if (!record || selectedSheetShoeId === null || selectedSheetShoeId === currentShoeId) {
      return;
    }

    try {
      await updateRunningRecordShoe({
        runningRecordId: record.id,
        shoeId: selectedSheetShoeId,
      });
      setIsShoeSheetVisible(false);
    } catch {
      // mutation state renders the failure message in the bottom sheet
    }
  }, [currentShoeId, record, selectedSheetShoeId, updateRunningRecordShoe]);

  const handleShare = useCallback(() => {
    if (!record) {
      return;
    }

    const { setShareData } = useShareStore.getState();
    const { beginEntryTransition } = useShareEntryTransitionStore.getState();

    setShareData({
      distance: record.distance,
      durationSec: record.durationSec,
      pace: formatPaceForUI(calculateAveragePace(record)),
      startTimestamp: new Date(record.startTimestamp * 1000).toISOString(),
      earnedPoints: Math.floor(record.distance / 100),
      locations: routeLocations,
    });

    beginEntryTransition();
    router.push('/share/editor' as any);
  }, [record, routeLocations]);

  if (recordQuery.isLoading && !record) {
    return (
      <View style={styles.screen}>
        <Header title="러닝 기록" topInset={insets.top} onBack={() => router.back()} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={PRIMARY[600]} />
        </View>
      </View>
    );
  }

  if (showFailure || !record) {
    return (
      <View style={styles.screen}>
        <Header title="러닝 기록" topInset={insets.top} onBack={() => router.back()} />
        <View style={styles.failureCard}>
          <View style={styles.failureIcon}>
            <Text style={styles.failureIconText}>!</Text>
          </View>
          <Text style={styles.failureTitle}>기록을 불러오지 못했어요</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.failureButton}
          activeOpacity={0.8}
        >
          <Text style={styles.failureButtonText}>이전 화면으로</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showMap) {
    return (
      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.routeScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <MapRenderBoundary onError={() => setMapRenderFailed(true)}>
            <RouteMapHero locations={routeLocations} />
          </MapRenderBoundary>
          <View style={styles.routeContent}>
            <Text style={styles.dateText}>{formatRecordDate(record.startTimestamp)}</Text>
            <RecordHero record={record} variant="route" />
            <StatsGrid record={record} variant="route" />
            <ConnectedShoeCard
              record={record}
              variant="route"
              onPress={handleOpenShoeSheet}
            />
          </View>
        </ScrollView>
        <Header
          title="러닝 기록"
          topInset={insets.top}
          onBack={() => router.back()}
          onShare={handleShare}
          overlay
        />
        <ShoeChangeBottomSheet
          visible={isShoeSheetVisible}
          currentShoeId={currentShoeId}
          selectedShoeId={selectedSheetShoeId}
          shoes={activeShoes}
          isLoading={isLoadingShoes}
          isError={hasShoeError}
          isSaving={isUpdatingRecordShoe}
          hasSaveError={isUpdateShoeError}
          bottomInset={insets.bottom}
          onClose={handleCloseShoeSheet}
          onSelectShoe={handleSelectSheetShoe}
          onSave={handleSaveShoeChange}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header
        title="러닝 기록"
        topInset={insets.top}
        onBack={() => router.back()}
        onShare={handleShare}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.noMapScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.dateText}>{formatRecordDate(record.startTimestamp)}</Text>
        <RecordHero record={record} variant="noMap" />
        <StatsGrid record={record} variant="noMap" />
        <ConnectedShoeCard
          record={record}
          variant="noMap"
          onPress={handleOpenShoeSheet}
        />
      </ScrollView>
      <ShoeChangeBottomSheet
        visible={isShoeSheetVisible}
        currentShoeId={currentShoeId}
        selectedShoeId={selectedSheetShoeId}
        shoes={activeShoes}
        isLoading={isLoadingShoes}
        isError={hasShoeError}
        isSaving={isUpdatingRecordShoe}
        hasSaveError={isUpdateShoeError}
        bottomInset={insets.bottom}
        onClose={handleCloseShoeSheet}
        onSelectShoe={handleSelectSheetShoe}
        onSave={handleSaveShoeChange}
      />
    </View>
  );
};

interface HeaderProps {
  title: string;
  topInset: number;
  onBack: () => void;
  onShare?: () => void;
  overlay?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, topInset, onBack, onShare, overlay }) => (
  <View
    style={[
      styles.header,
      { height: topInset + HEADER_BAR_HEIGHT, paddingTop: topInset },
      overlay && styles.headerOverlay,
    ]}
  >
    <TouchableOpacity onPress={onBack} style={styles.headerButton} activeOpacity={0.7}>
      <Ionicons name="chevron-back" size={28} color={GREY[900]} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
    {onShare ? (
      <TouchableOpacity onPress={onShare} style={styles.headerButton} activeOpacity={0.7}>
        <Ionicons name="share-social-outline" size={24} color={GREY[900]} />
      </TouchableOpacity>
    ) : (
      <View style={styles.headerButton} />
    )}
  </View>
);

interface RecordHeroProps {
  record: RunningRecord;
  variant: 'route' | 'noMap';
}

const RecordHero: React.FC<RecordHeroProps> = ({ record, variant }) => {
  return (
    <View style={[styles.recordHero, variant === 'route' ? styles.recordHeroRoute : styles.recordHeroNoMap]}>
      <View style={styles.distanceRow}>
        <Text style={styles.distanceValue}>{(record.distance / 1000).toFixed(2)}</Text>
        <Text style={styles.distanceUnit}>km</Text>
      </View>
      <Text style={styles.distanceCaption}>오늘의 러닝 거리</Text>
    </View>
  );
};

interface StatsGridProps {
  record: RunningRecord;
  variant: 'route' | 'noMap';
}

const StatsGrid: React.FC<StatsGridProps> = ({ record, variant }) => {
  const heartRate = formatSensorValue(record.heartRate);
  const cadence = formatSensorValue(record.cadence);

  return (
    <View style={[styles.statsGrid, variant === 'route' ? styles.statsGridRoute : styles.statsGridNoMap]}>
      <View style={styles.metricTopRow}>
        <MetricCard label="총 시간" value={formatDurationMetric(record.durationSec)} />
        <MetricCard
          label="평균 페이스"
          value={formatPaceMetric(calculateAveragePace(record))}
          unit="/km"
          unitPlacement="below"
        />
        <MetricCard label="칼로리" value={`${record.calorie}`} unit="kcal" />
      </View>
      <View style={styles.metricBottomRow}>
        <MetricCard
          label="평균 심박"
          value={heartRate}
          unit={heartRate === '--' ? undefined : 'BPM'}
          unitPlacement="trailing"
        />
        <MetricCard
          label="케이던스"
          value={cadence}
          unit={cadence === '--' ? undefined : 'spm'}
          unitPlacement="trailing"
        />
      </View>
    </View>
  );
};

interface ConnectedShoeCardProps {
  record: RunningRecord;
  variant: 'route' | 'noMap';
  onPress: () => void;
}

const ConnectedShoeCard: React.FC<ConnectedShoeCardProps> = ({
  record,
  variant,
  onPress,
}) => {
  const connectedShoe = record.connectedShoe ?? null;
  const isConnected = connectedShoe !== null;

  return (
    <View
      style={[
        styles.connectedShoeCard,
        variant === 'route' ? styles.connectedShoeCardRoute : styles.connectedShoeCardNoMap,
      ]}
    >
      <View style={styles.connectedShoeIconBox}>
        <Icon name="shoe" size={37} />
      </View>
      <View style={styles.connectedShoeInfo}>
        {connectedShoe ? (
          <>
            <View style={styles.connectedShoeBrandRow}>
              <Text style={styles.connectedShoeBrand}>{connectedShoe.brand}</Text>
              {connectedShoe.isMain ? (
                <View style={styles.connectedShoeMainBadge}>
                  <Text style={styles.connectedShoeMainBadgeText}>현재 착용</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.connectedShoeModel} numberOfLines={1}>
              {connectedShoe.model}
            </Text>
            <Text style={styles.connectedShoeDistance}>
              누적 거리 {(connectedShoe.totalDistance / 1000).toFixed(1)}km
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.connectedShoeEmptyTitle}>연결된 신발이 없어요</Text>
            <Text style={styles.connectedShoeEmptySubtitle}>
              러닝 기록에 신발을 연결해보세요
            </Text>
          </>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.connectedShoeAction,
          isConnected ? styles.connectedShoeChangeAction : styles.connectedShoeSelectAction,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.connectedShoeActionText}>
          {isConnected ? '변경' : '신발 선택'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

interface ShoeChangeBottomSheetProps {
  visible: boolean;
  currentShoeId: number | null;
  selectedShoeId: number | null;
  shoes: Shoe[];
  isLoading: boolean;
  isError: boolean;
  isSaving: boolean;
  hasSaveError: boolean;
  bottomInset: number;
  onClose: () => void;
  onSelectShoe: (shoeId: number) => void;
  onSave: () => void;
}

const ShoeChangeBottomSheet: React.FC<ShoeChangeBottomSheetProps> = ({
  visible,
  currentShoeId,
  selectedShoeId,
  shoes,
  isLoading,
  isError,
  isSaving,
  hasSaveError,
  bottomInset,
  onClose,
  onSelectShoe,
  onSave,
}) => {
  const mainShoeId = shoes.find((shoe) => shoe.isMain)?.id ?? null;
  const canSave = selectedShoeId !== null && selectedShoeId !== currentShoeId && !isSaving;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          disabled={isSaving}
          onPress={onClose}
        />
        <View style={[styles.sheetContainer, { paddingBottom: Math.max(bottomInset, 16) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>연결 신발 변경</Text>
              <Text style={styles.sheetDescription}>
                이 러닝 기록에 연결할 신발을 선택하세요
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sheetCloseButton}
              onPress={onClose}
              activeOpacity={0.7}
              disabled={isSaving}
            >
              <Ionicons name="close" size={22} color={GREY[700]} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.sheetState}>
              <ActivityIndicator size="small" color={PRIMARY[600]} />
            </View>
          ) : isError ? (
            <View style={styles.sheetState}>
              <Text style={styles.sheetStateText}>신발 목록을 불러오지 못했어요.</Text>
            </View>
          ) : shoes.length === 0 ? (
            <View style={styles.sheetState}>
              <Text style={styles.sheetStateText}>선택할 수 있는 활성 신발이 없어요.</Text>
            </View>
          ) : (
            <ShoeSnapCarousel
              shoes={shoes}
              selectedShoeId={selectedShoeId}
              mainShoeId={mainShoeId}
              onShoeSelect={onSelectShoe}
            />
          )}

          {hasSaveError ? (
            <Text style={styles.sheetErrorText}>
              연결 신발을 변경하지 못했어요. 다시 시도해주세요.
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.sheetSaveButton, !canSave && styles.sheetSaveButtonDisabled]}
            onPress={onSave}
            activeOpacity={0.8}
            disabled={!canSave}
          >
            {isSaving ? (
              <View style={styles.sheetSavingContent}>
                <ActivityIndicator size="small" color={GREY.WHITE} />
                <Text style={styles.sheetSaveButtonText}>변경 중...</Text>
              </View>
            ) : (
              <Text style={styles.sheetSaveButtonText}>변경하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string | undefined;
  unitPlacement?: 'inline' | 'below' | 'trailing';
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  unitPlacement = 'inline',
}) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricLabel}>{label}</Text>
    {unitPlacement === 'below' ? (
      <View style={styles.metricStack}>
        <Text style={styles.metricValue}>{value}</Text>
        {unit ? <Text style={styles.metricUnitBelow}>{unit}</Text> : null}
      </View>
    ) : (
      <View
        style={[
          styles.metricValueRow,
          unitPlacement === 'trailing' && styles.metricValueRowTrailing,
        ]}
      >
        <Text style={styles.metricValue}>{value}</Text>
        {unit ? (
          <Text
            style={[
              styles.metricUnit,
              unitPlacement === 'trailing' && styles.metricUnitTrailing,
            ]}
          >
            {unit}
          </Text>
        ) : null}
      </View>
    )}
  </View>
);

const formatDurationMetric = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

const formatPaceMetric = (paceMinPerKm: number): string => {
  const pace = formatPaceForUI(paceMinPerKm);
  const [minutes, seconds = '00'] = pace.split(':');

  return `${minutes}'${seconds}"`;
};

const formatSensorValue = (value: number | null): string => {
  if (value === null || value === 0) {
    return '--';
  }

  return `${value}`;
};

interface RouteMapHeroProps {
  locations: Location[];
}

const RouteMapHero: React.FC<RouteMapHeroProps> = ({ locations }) => {
  const coordinates = useMemo<LatLng[]>(() => getRouteCoordinates(locations), [locations]);
  const region = useMemo<Region | null>(() => getRouteRegion(locations), [locations]);
  const startCoordinate = coordinates[0];
  const endCoordinate = coordinates[coordinates.length - 1];

  if (!region || !startCoordinate || !endCoordinate || coordinates.length < 2) {
    return null;
  }

  return (
    <View style={styles.mapHero}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        loadingEnabled
        loadingBackgroundColor="#E7EEE6"
        loadingIndicatorColor="#116B37"
      >
        <Polyline
          coordinates={coordinates}
          strokeColor="#FFFFFF"
          strokeWidth={9}
          lineCap="round"
          lineJoin="round"
        />
        <Polyline
          coordinates={coordinates}
          strokeColor="#116B37"
          strokeWidth={5}
          lineCap="round"
          lineJoin="round"
        />
        <Marker coordinate={startCoordinate} anchor={{ x: 0.5, y: 0.18 }}>
          <RouteMarker label="출발" />
        </Marker>
        <Marker coordinate={endCoordinate} anchor={{ x: 0.5, y: 0.18 }}>
          <RouteMarker label="도착" />
        </Marker>
      </MapView>
    </View>
  );
};

interface RouteMarkerProps {
  label: string;
}

const RouteMarker: React.FC<RouteMarkerProps> = ({ label }) => (
  <View style={styles.routeMarker}>
    <View style={styles.routeMarkerDot} />
    <View style={styles.routeMarkerLabel}>
      <Text style={styles.routeMarkerLabelText}>{label}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#F7F8F6',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: GREY[900],
  },
  scrollView: {
    flex: 1,
  },
  routeScrollContent: {
    paddingBottom: 40,
  },
  routeContent: {
    paddingTop: 24,
  },
  noMapScrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  failureCard: {
    height: 95,
    marginHorizontal: 24,
    marginTop: 23,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E1E6DF',
    backgroundColor: GREY.WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  failureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F2EF',
  },
  failureIconText: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    color: '#202020',
  },
  failureTitle: {
    marginLeft: 16,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: '#202020',
  },
  failureButton: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 31,
    height: 53,
    borderRadius: 14,
    backgroundColor: PRIMARY[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  failureButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: GREY.WHITE,
  },
  dateText: {
    marginHorizontal: 24,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    color: '#657067',
  },
  recordHero: {
    marginHorizontal: 24,
  },
  recordHeroRoute: {
    marginTop: 18,
  },
  recordHeroNoMap: {
    marginTop: 28,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  distanceValue: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '800',
    color: '#102318',
  },
  distanceUnit: {
    marginLeft: 8,
    marginBottom: 8,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#102318',
  },
  distanceCaption: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#657067',
  },
  statsGrid: {
    paddingHorizontal: 16,
    gap: 16,
  },
  statsGridRoute: {
    marginTop: 27,
  },
  statsGridNoMap: {
    marginTop: 15,
  },
  metricTopRow: {
    height: 91,
    flexDirection: 'row',
    gap: 8,
  },
  metricBottomRow: {
    height: 82,
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 7,
    backgroundColor: GREY.WHITE,
    paddingHorizontal: 13,
    paddingTop: 14,
    paddingBottom: 10,
  },
  metricLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: '#657067',
  },
  metricValueRow: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  metricValueRowTrailing: {
    justifyContent: 'space-between',
  },
  metricStack: {
    marginTop: 11,
  },
  metricValue: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
    color: '#102318',
  },
  metricUnit: {
    marginLeft: 4,
    marginBottom: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#657067',
  },
  metricUnitBelow: {
    marginTop: -2,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: '#657067',
  },
  metricUnitTrailing: {
    marginLeft: 8,
    marginBottom: 4,
  },
  connectedShoeCard: {
    marginHorizontal: 16,
    height: 112,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GREY[200],
    borderRadius: 8,
    backgroundColor: GREY.WHITE,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedShoeCardRoute: {
    marginTop: 20,
  },
  connectedShoeCardNoMap: {
    marginTop: 24,
  },
  connectedShoeIconBox: {
    width: 64,
    height: 64,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GREY[200],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREY[50],
  },
  connectedShoeInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },
  connectedShoeBrandRow: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedShoeBrand: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
    color: GREY[500],
  },
  connectedShoeMainBadge: {
    height: 20,
    marginLeft: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY[50],
  },
  connectedShoeMainBadgeText: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '500',
    color: PRIMARY[800],
  },
  connectedShoeModel: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: GREY[900],
  },
  connectedShoeDistance: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
    color: GREY[300],
  },
  connectedShoeEmptyTitle: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: GREY[900],
  },
  connectedShoeEmptySubtitle: {
    marginTop: 9,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '500',
    color: GREY[500],
  },
  connectedShoeAction: {
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY[50],
  },
  connectedShoeChangeAction: {
    width: 50,
  },
  connectedShoeSelectAction: {
    width: 72,
  },
  connectedShoeActionText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: PRIMARY[800],
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetContainer: {
    maxHeight: '82%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: GREY.WHITE,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    backgroundColor: GREY[200],
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: GREY[900],
  },
  sheetDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: GREY[600],
  },
  sheetCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREY[50],
  },
  sheetState: {
    minHeight: 228,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheetStateText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: GREY[600],
    textAlign: 'center',
  },
  sheetErrorText: {
    marginHorizontal: 20,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#D92D20',
  },
  sheetSaveButton: {
    height: 52,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY[600],
  },
  sheetSaveButtonDisabled: {
    backgroundColor: GREY[200],
  },
  sheetSavingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetSaveButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: GREY.WHITE,
  },
  mapHero: {
    height: MAP_HERO_HEIGHT,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#E7EEE6',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  routeMarker: {
    alignItems: 'center',
  },
  routeMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: GREY.WHITE,
    backgroundColor: '#116B37',
  },
  routeMarkerLabel: {
    marginTop: 5,
    minWidth: 42,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREY.WHITE,
  },
  routeMarkerLabelText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#116B37',
  },
});
