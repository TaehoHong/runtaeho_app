import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch } from '../../../store/hooks';
import {
  useStartRunningMutation,
  useEndRunningMutation,
  useUpdateRunningRecordMutation,
  // useGetRunningRecordsQuery, // TODO: 향후 러닝 기록 목록 조회용
  // useLoadRunningRecordsQuery, // TODO: 향후 러닝 기록 로드용
  useDeleteRunningRecordMutation,
} from '../../../store/api/runningApi';
import {
  RunningRecord,
  EndRunningRecord,
  Location,
  createRunningRecord,
  updateRunningRecord,
  // calculateAveragePace, // TODO: 향후 평균 페이스 계산용
  // calculateAverageSpeed, // TODO: 향후 평균 속도 계산용
  formatRunningRecord,
} from '../models';

/**
 * 실시간 러닝 통계
 * Swift StatsManager에서 마이그레이션
 */
interface RunningStats {
  bpm: number; // Heart rate (beats per minute)
  pace: {
    minutes: number;
    seconds: number;
    totalSeconds: number;
  };
  speed: number; // km/h
  calories: number;
}

/**
 * 러닝 상태
 */
export enum RunningState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

/**
 * Running ViewModel
 * Swift StatsManager와 Running 관련 로직들을 React Hook으로 마이그레이션
 */
export const useRunningViewModel = () => {
  // const dispatch = useAppDispatch(); // TODO: 향후 Redux 액션 디스패치용

  // 현재 러닝 상태
  const [runningState, setRunningState] = useState<RunningState>(RunningState.IDLE);
  const [currentRecord, setCurrentRecord] = useState<RunningRecord | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [locations, setLocations] = useState<Location[]>([]);

  // 실시간 통계 (Swift StatsManager와 동일)
  const [stats, setStats] = useState<RunningStats>({
    bpm: 0,
    pace: { minutes: 0, seconds: 0, totalSeconds: 0 },
    speed: 0,
    calories: 0,
  });

  // API Mutations
  const [startRunningMutation, { isLoading: isStarting }] = useStartRunningMutation();
  const [endRunningMutation, { isLoading: isEnding }] = useEndRunningMutation();
  const [updateRecordMutation] = useUpdateRunningRecordMutation();
  const [deleteRecordMutation] = useDeleteRunningRecordMutation();

  // 타이머 인터벌
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (runningState === RunningState.RUNNING && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);

        // 실시간 통계 업데이트 (Swift updateStats 메서드와 동일)
        updateStats(distance, elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [runningState, startTime, distance, updateStats]);

  /**
   * 실시간 통계 업데이트
   * Swift StatsManager.updateStats 메서드와 동일
   */
  const updateStats = useCallback((distanceMeters: number, elapsedSeconds: number) => {
    if (elapsedSeconds === 0) return;

    // BPM (심박수) - 임시로 랜덤 생성 (Swift와 동일)
    const bpm = Math.floor(Math.random() * (150 - 120 + 1)) + 120;

    // 페이스 계산 (분/km)
    const paceSeconds = distanceMeters > 0 ? Math.floor((elapsedSeconds / distanceMeters) * 1000) : 0;
    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceSecondsRemainder = paceSeconds % 60;

    // 속도 계산 (km/h)
    const speedKmh = distanceMeters > 0 ? (distanceMeters / elapsedSeconds) * 3.6 : 0;

    // 칼로리 계산 (Swift와 동일한 공식)
    // MET * 체중(kg) * 시간 (러닝 MET: 9.8, 기본 체중: 70kg)
    const weight = 70.0;
    const hours = elapsedSeconds / 3600.0;
    const caloriesBurned = 9.8 * weight * hours;

    setStats({
      bpm,
      pace: {
        minutes: paceMinutes,
        seconds: paceSecondsRemainder,
        totalSeconds: paceSeconds,
      },
      speed: speedKmh,
      calories: caloriesBurned,
    });
  }, []);

  /**
   * 러닝 시작
   * Swift RunningRecordService.startRunning 메서드 대응
   */
  const startRunning = useCallback(async () => {
    try {
      const record = await startRunningMutation().unwrap();
      setCurrentRecord(record);
      setStartTime(Date.now());
      setElapsedTime(0);
      setDistance(0);
      setLocations([]);
      setRunningState(RunningState.RUNNING);

      // 통계 초기화
      setStats({
        bpm: 0,
        pace: { minutes: 0, seconds: 0, totalSeconds: 0 },
        speed: 0,
        calories: 0,
      });

      return record;
    } catch (error) {
      console.error('Failed to start running:', error);
      // Swift와 동일하게 에러 시 더미 기록 생성
      const dummyRecord = createRunningRecord(0);
      setCurrentRecord(dummyRecord);
      setStartTime(Date.now());
      setRunningState(RunningState.RUNNING);
      return dummyRecord;
    }
  }, [startRunningMutation]);

  /**
   * 러닝 일시정지
   */
  const pauseRunning = useCallback(() => {
    setRunningState(RunningState.PAUSED);
  }, []);

  /**
   * 러닝 재개
   */
  const resumeRunning = useCallback(() => {
    setRunningState(RunningState.RUNNING);
  }, []);

  /**
   * 러닝 종료
   * Swift RunningRecordService.end 메서드 대응
   */
  const endRunning = useCallback(async (): Promise<EndRunningRecord | null> => {
    if (!currentRecord) return null;

    try {
      // 최종 기록 업데이트
      const finalRecord = updateRunningRecord(currentRecord, {
        distance,
        cadence: 0, // TODO: 실제 케이던스 측정 구현
        heartRate: stats.bpm,
        calorie: Math.round(stats.calories),
        durationSec: elapsedTime,
      });

      const endRecord = await endRunningMutation(finalRecord).unwrap();

      setRunningState(RunningState.COMPLETED);
      return endRecord;
    } catch (error) {
      console.error('Failed to end running:', error);
      throw error;
    }
  }, [currentRecord, distance, stats, elapsedTime, endRunningMutation]);

  /**
   * 러닝 기록 업데이트
   * Swift RunningRecordService.update 메서드 대응
   */
  const updateCurrentRecord = useCallback(async () => {
    if (!currentRecord) return;

    try {
      const updatedRecord = updateRunningRecord(currentRecord, {
        distance,
        heartRate: stats.bpm,
        calorie: Math.round(stats.calories),
        durationSec: elapsedTime,
      });

      await updateRecordMutation(updatedRecord).unwrap();
      setCurrentRecord(updatedRecord);
    } catch (error) {
      console.error('Failed to update running record:', error);
    }
  }, [currentRecord, distance, stats, elapsedTime, updateRecordMutation]);

  /**
   * 거리 업데이트 (GPS 트래킹)
   */
  const updateDistance = useCallback((newDistance: number) => {
    setDistance(newDistance);
  }, []);

  /**
   * 위치 추가
   */
  const addLocation = useCallback((location: Location) => {
    setLocations(prev => [...prev, location]);
  }, []);

  /**
   * 러닝 기록 삭제
   */
  const deleteRecord = useCallback(async (recordId: number) => {
    try {
      await deleteRecordMutation(recordId).unwrap();
    } catch (error) {
      console.error('Failed to delete running record:', error);
      throw error;
    }
  }, [deleteRecordMutation]);

  /**
   * 러닝 초기화
   */
  const resetRunning = useCallback(() => {
    setRunningState(RunningState.IDLE);
    setCurrentRecord(null);
    setStartTime(null);
    setElapsedTime(0);
    setDistance(0);
    setLocations([]);
    setStats({
      bpm: 0,
      pace: { minutes: 0, seconds: 0, totalSeconds: 0 },
      speed: 0,
      calories: 0,
    });
  }, []);

  return {
    // State
    runningState,
    currentRecord,
    elapsedTime,
    distance,
    locations,
    stats,

    // Loading states
    isStarting,
    isEnding,

    // Actions
    startRunning,
    pauseRunning,
    resumeRunning,
    endRunning,
    updateCurrentRecord,
    updateDistance,
    addLocation,
    deleteRecord,
    resetRunning,

    // Computed values
    isRunning: runningState === RunningState.RUNNING,
    isPaused: runningState === RunningState.PAUSED,
    isCompleted: runningState === RunningState.COMPLETED,
    formattedStats: currentRecord ? formatRunningRecord({
      ...currentRecord,
      distance,
      durationSec: elapsedTime,
      heartRate: stats.bpm,
      calorie: Math.round(stats.calories),
    }) : null,
  };
};