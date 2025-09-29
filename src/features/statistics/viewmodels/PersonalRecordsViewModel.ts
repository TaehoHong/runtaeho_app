import { useMemo } from 'react';
import { useGetPersonalRecordsQuery } from '../../../store/api/statisticApi';

/**
 * 개인 기록 전용 ViewModel
 * StatisticViewModel에서 분리된 개인 기록 관리 Hook
 */
export const usePersonalRecordsViewModel = () => {
  const {
    data: personalRecords,
    error,
    isLoading,
    refetch,
  } = useGetPersonalRecordsQuery();

  const formattedRecords = useMemo(() => {
    if (!personalRecords) return null;

    return {
      ...personalRecords,
      longestDistance: {
        ...personalRecords.longestDistance,
        formattedValue: `${(personalRecords.longestDistance.value / 1000).toFixed(2)}km`,
        formattedDate: new Date(personalRecords.longestDistance.date).toLocaleDateString('ko-KR'),
      },
      longestDuration: {
        ...personalRecords.longestDuration,
        formattedValue: `${Math.floor(personalRecords.longestDuration.value / 3600)}시간 ${Math.floor((personalRecords.longestDuration.value % 3600) / 60)}분`,
        formattedDate: new Date(personalRecords.longestDuration.date).toLocaleDateString('ko-KR'),
      },
      fastestPace: {
        ...personalRecords.fastestPace,
        formattedValue: `${personalRecords.fastestPace.value.toFixed(2)}분/km`,
        formattedDate: new Date(personalRecords.fastestPace.date).toLocaleDateString('ko-KR'),
      },
      mostCalories: {
        ...personalRecords.mostCalories,
        formattedValue: `${personalRecords.mostCalories.value}kcal`,
        formattedDate: new Date(personalRecords.mostCalories.date).toLocaleDateString('ko-KR'),
      },
    };
  }, [personalRecords]);

  return {
    personalRecords,
    formattedRecords,
    error,
    isLoading,
    refetch,
    hasRecords: !!personalRecords,
    hasError: !!error,
  };
};