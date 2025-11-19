import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import { MainDistanceCard, DetailedStatisticsCard, ShoeSelectionArea, CompleteButton } from '~/shared/components';
import { PointInfoBar } from './components/point-info-bar';
import { AddShoeCard } from './components/add-shoe-card';
import { useRunning } from '../contexts';
import { runningService } from '../services/runningService';
import { updateRunningRecord } from '../models';
import { useGetUserPoint } from '~/features/point/services/pointQueries';
import { useShoeViewModel } from '~/features/shoes/viewmodels';
import { GREY } from '~/shared/styles';

const { width } = Dimensions.get('window');

/**
 * 러닝 완료 화면
 * iOS RunningFinishedView 대응
 * 결과 데이터와 저장 버튼 표시
 */
export const RunningFinishedView: React.FC = () => {
  const setRunningState = useAppStore((state) => state.setRunningState);
  const { currentRecord, resetRunning } = useRunning();

  // 신발 데이터 가져오기
  const { shoes, isLoadingShoes } = useShoeViewModel();
  const [selectedShoeId, setSelectedShoeId] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 사용자 포인트 조회
  const { data: userPointData } = useGetUserPoint();

  // 활성화된 신발 필터링
  const availableShoes = useMemo(() => {
    if (!shoes) return [];
    return shoes.filter(shoe => shoe.isEnabled);
  }, [shoes]);

  const hasShoe = availableShoes.length > 0; 

  // 획득 포인트 계산 (100m당 1포인트)
  const earnedPoints = currentRecord
    ? Math.floor((currentRecord.distance || 0) / 100)
    : 0;

  // 보유 포인트
  const totalPoints = userPointData?.point || 0;

  // 신발 추가 후 자동으로 React Query가 신발 목록을 갱신하고,
  // 첫 신발이므로 자동으로 메인 설정되어 ShoeSelectionArea가 표시됩니다.

  const handleComplete = async () => {
    console.log('🏁 [RunningFinishedView] 러닝 완료 확인 버튼 눌러짐');

    // currentRecord가 없으면 에러
    if (!currentRecord) {
      console.error('❌ [RunningFinishedView] currentRecord가 없습니다');
      Alert.alert('오류', '러닝 기록을 찾을 수 없습니다.');
      return;
    }

    try {
      setIsUpdating(true);

      // 선택된 신발이 있으면 runningRecord 업데이트
      if (selectedShoeId !== null) {
        console.log(`👟 [RunningFinishedView] 선택된 신발 ID: ${selectedShoeId}로 업데이트 중...`);

        const updatedRecord = updateRunningRecord(currentRecord, {
          shoeId: selectedShoeId,
        });

        await runningService.updateRunningRecord(updatedRecord);
        console.log('✅ [RunningFinishedView] 신발 정보 업데이트 완료');
      }

      // 러닝 상태 초기화
      resetRunning();

      // 러닝 종료 후 Stopped 상태로 복귀
      setRunningState(RunningState.Stopped);
      console.log('✅ [RunningFinishedView] 러닝 완료 처리 완료');
    } catch (error) {
      console.error('❌ [RunningFinishedView] 러닝 완료 처리 실패:', error);
      Alert.alert('오류', '러닝 데이터 저장에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
            onShoeSelect={(shoeId) => {
              console.log(`👟 [RunningFinishedView] 신발 선택됨: ${shoeId}`);
              setSelectedShoeId(shoeId);
            }}
            initialSelectedShoeId={selectedShoeId}
          />
        ) : (
          <AddShoeCard />
        )}

        {/* 완료 버튼 - iOS의 [저장] */}
        <CompleteButton
          onPress={handleComplete}
          disabled={isUpdating}
        />
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
    paddingBottom: 32,
  },
  pointInfo: {

  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});