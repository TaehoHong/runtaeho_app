import React, { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import { useUserStore } from '~/stores/user/userStore';
import { MainDistanceCard } from './components/main-distance-card';
import { DetailedStatisticsCard } from './detailed-statistics-card';
import { ShoeSelectionArea } from './shoe-selection-area';
import { CompleteButton } from './components/complete-button';
import { ShareButton } from './components/share-button';
import { PointInfoBar } from './components/point-info-bar';
import { AddShoeCard } from './components/add-shoe-card';
import { useRunning } from '../contexts';
import { runningService } from '../services/runningService';
import { type Location, type RunningRecord } from '../models';
import { useShoeViewModel } from '~/features/shoes/viewmodels';
import { leagueService } from '~/features/league/services/leagueService';
import { useShareStore } from '~/features/share/stores/shareStore';
import { useShareEntryTransitionStore } from '~/features/share/stores/shareEntryTransitionStore';
import { useBottomActionOffset } from '~/shared/hooks';
import { GREY } from '~/shared/styles';

const { width } = Dimensions.get('window');

/**
 * 러닝 완료 화면
 * iOS RunningFinishedView 대응
 * 결과 데이터와 저장 버튼 표시
 */
export const RunningFinishedView: React.FC = () => {
  const setRunningState = useAppStore((state) => state.setRunningState);
  const setPreviousLeagueRank = useAppStore((state) => state.setPreviousLeagueRank);
  const scrollContentPaddingBottom = useBottomActionOffset(32);
  const {
    currentRecord,
    resetRunning,
    distance,
    stats,
    elapsedTime,
    formatPace,
    locations,
    currentSegmentItems,
  } = useRunning();

  // 신발 데이터 가져오기
  const { shoes, mainShoe, isLoadingShoes } = useShoeViewModel();
  const [selectedShoeId, setSelectedShoeId] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 사용자 포인트 (Single Source of Truth: userStore)
  const totalPoint = useUserStore((state) => state.totalPoint);

  // 활성화된 신발 필터링
  const availableShoes = useMemo(() => {
    if (!shoes) return [];
    return shoes.filter(shoe => shoe.isEnabled);
  }, [shoes]);

  const hasShoe = availableShoes.length > 0; 

  // 획득 포인트 계산 (100m당 1포인트)
  // NOTE: currentRecord.distance는 초기값(0)이므로, 실시간 distance state 사용
  const earnedPoints = Math.floor(distance / 100);

  // 보유 포인트
  const totalPoints = totalPoint;

  // 신발 추가 후 자동으로 React Query가 신발 목록을 갱신하고,
  // 첫 신발이므로 자동으로 메인 설정되어 ShoeSelectionArea가 표시됩니다.

  const normalizeLocations = (source: Location[]): Location[] => {
    const validLocations = source
      .filter((point) =>
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        point.timestamp instanceof Date &&
        Number.isFinite(point.timestamp.getTime())
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const deduplicated: Location[] = [];
    for (const location of validLocations) {
      const prev = deduplicated[deduplicated.length - 1];
      if (
        prev &&
        prev.latitude === location.latitude &&
        prev.longitude === location.longitude &&
        prev.timestamp.getTime() === location.timestamp.getTime()
      ) {
        continue;
      }
      deduplicated.push(location);
    }
    return deduplicated;
  };

  const getSegmentLocations = (): Location[] => {
    return currentSegmentItems.flatMap((segment) => segment.locations ?? []);
  };

  const getLocationsFromServer = async (): Promise<Location[]> => {
    if (!currentRecord) return [];

    try {
      const items = await runningService.getRunningRecordItems(currentRecord.id);
      return items.flatMap((item) =>
        (item.gpsPoints ?? []).map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
          timestamp: new Date(point.timestampMs),
          speed: point.speed,
          altitude: point.altitude,
          ...(point.accuracy !== undefined && { accuracy: point.accuracy }),
        }))
      );
    } catch (error) {
      console.warn('[RunningFinishedView] Failed to fetch running record items:', error);
      return [];
    }
  };

  const resolveShareLocations = async (): Promise<Location[]> => {
    const currentLocations = normalizeLocations(locations);
    if (currentLocations.length >= 2) return currentLocations;

    const segmentLocations = normalizeLocations(getSegmentLocations());
    if (segmentLocations.length >= 2) return segmentLocations;

    const serverLocations = normalizeLocations(await getLocationsFromServer());
    return serverLocations;
  };

  const handleShoeSelect = useCallback((shoeId: number) => {
    console.log(`👟 [RunningFinishedView] 신발 선택됨: ${shoeId}`);
    setSelectedShoeId(shoeId);
  }, []);

  // 공유 버튼 핸들러
  const handleShare = async () => {
    const resolvedLocations = await resolveShareLocations();
    const { setShareData } = useShareStore.getState();
    const { beginEntryTransition } = useShareEntryTransitionStore.getState();

    // Store에 공유 데이터 저장 (GPS locations 포함)
    // URL params로는 배열 전달이 불가능하므로 Zustand store 사용
    setShareData({
      distance,
      durationSec: elapsedTime,
      pace: formatPace(stats.pace.minutes, stats.pace.seconds),
      startTimestamp: new Date().toISOString(),
      earnedPoints,
      locations: resolvedLocations,
    });

    beginEntryTransition();

    // 공유 에디터 화면으로 이동 (params 불필요)
    router.push('/share/editor' as any);
  };

  const handleComplete = async () => {
    console.log('🏁 [RunningFinishedView] 러닝 완료 확인 버튼 눌러짐');

    // 10m 미만이면 API 호출 없이 초기화
    if (distance < 10) {
      console.log('🏁 [RunningFinishedView] 거리 10m 미만, API 호출 스킵');
      resetRunning();
      setRunningState(RunningState.Stopped);
      router.replace('/(tabs)/league');
      return;
    }

    // currentRecord가 없으면 에러
    if (!currentRecord) {
      console.error('❌ [RunningFinishedView] currentRecord가 없습니다');
      Alert.alert('오류', '러닝 기록을 찾을 수 없습니다.');
      return;
    }

    try {
      setIsUpdating(true);

      // 선택된 신발이 있으면 runningRecord 업데이트
      console.log(`👟 [RunningFinishedView] 선택된 신발 ID: ${selectedShoeId}로 업데이트 중...`);

      const newShoeId = selectedShoeId ?? mainShoe?.id ?? currentRecord.shoeId;
      const updatedRecord: RunningRecord = {
        ...currentRecord,
        ...(newShoeId != null && { shoeId: newShoeId }),
      };

      await runningService.updateRunningRecord(updatedRecord);
      console.log('✅ [RunningFinishedView] 신발 정보 업데이트 완료');

      // 리그 거리 업데이트 (순위 애니메이션을 위한 처리)
      try {
        // 1. 현재 리그 정보 조회 (이전 순위 획득)
        let currentLeague = await leagueService.getCurrentLeague();

        // 리그 세션이 없으면 자동으로 리그 참가
        if (!currentLeague) {
          console.log('🏆 [RunningFinishedView] 리그 세션 없음, 자동 참가 진행...');
          await leagueService.joinLeague();
          console.log('✅ [RunningFinishedView] 리그 참가 완료');

          // 참가 후 리그 정보 다시 조회
          currentLeague = await leagueService.getCurrentLeague();
        }

        if (currentLeague) {
          const myParticipant = currentLeague.participants.find(p => p.isMe);

          if (myParticipant) {
            const previousRank = myParticipant.rank;
            console.log(`🏆 [RunningFinishedView] 이전 순위: ${previousRank}`);

            // 2. 리그 참가자 거리 업데이트
            await leagueService.updateParticipantDistance(myParticipant.id, distance);
            console.log(`📊 [RunningFinishedView] 리그 거리 업데이트 완료: ${distance}m`);

            // 3. 이전 순위 저장 (애니메이션용)
            setPreviousLeagueRank(previousRank);
          }
        }
      } catch (leagueError) {
        // 리그 관련 에러는 무시 (리그 참가 실패 등)
        console.log('ℹ️ [RunningFinishedView] 리그 업데이트 스킵:', leagueError);
      }

      // 러닝 상태 초기화
      resetRunning();

      // 러닝 종료 후 Stopped 상태로 복귀
      setRunningState(RunningState.Stopped);
      console.log('✅ [RunningFinishedView] 러닝 완료 처리 완료');

      // 리그 탭으로 이동하여 순위 확인
      router.replace('/(tabs)/league');
      console.log('🏆 [RunningFinishedView] 리그 탭으로 이동');
    } catch (error) {
      console.error('❌ [RunningFinishedView] 러닝 완료 처리 실패:', error);
      Alert.alert('오류', '러닝 데이터 저장에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollContentPaddingBottom }]}
      >
        {/* 포인트 정보 바 - 획득/보유 포인트 */}
        <PointInfoBar
          earnedPoints={earnedPoints}
          totalPoints={totalPoints}
        />

        {/* 상세 통계 카드 - BPM, 페이스, 러닝 시간 */}
        <DetailedStatisticsCard />

        {/* 메인 거리 카드 */}
        <MainDistanceCard />

        {/* 신발 선택 영역 - 조건부 렌더링 */}
        {isLoadingShoes ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={GREY[800]} />
          </View>
        ) : hasShoe ? (
          <ShoeSelectionArea
            onShoeSelect={handleShoeSelect}
            initialSelectedShoeId={selectedShoeId ?? mainShoe?.id ?? currentRecord?.shoeId ?? null}
          />
        ) : (
          <AddShoeCard />
        )}

        {/* 버튼 영역 */}
        <View style={styles.buttonRow}>
          <ShareButton
            onPress={handleShare}
            disabled={isUpdating}
          />
          <CompleteButton
            onPress={handleComplete}
            disabled={isUpdating}
          />
        </View>
      </ScrollView>
    </View>
  );
};

// 역호환성을 위한 export
export const RunningFinished = RunningFinishedView;

const styles = StyleSheet.create({
  container: {
    width: width,
    flex: 1,
    justifyContent: 'flex-start',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 16,
  },
  pointInfo: {

  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 24,
  },
});
