/**
 * 리그 결과 상세 화면 라우트
 * /league/result-detail
 *
 * 정책:
 * - 뒤로가기 블록 (스와이프, 하드웨어 백버튼 차단)
 * - 반드시 '확인' 버튼을 눌러야 함
 */

import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useLocalSearchParams, Redirect, useNavigation } from 'expo-router';
import { LeagueResultDetailView } from '~/features/league/views';
import type { LeagueResult } from '~/features/league/models';

export default function LeagueResultDetailScreen() {
  const params = useLocalSearchParams<{ resultData?: string }>();
  const navigation = useNavigation();

  // 뒤로가기 블록 (스와이프 제스처 차단)
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false, // iOS 스와이프 뒤로가기 차단
    });
  }, [navigation]);

  // 뒤로가기 블록 (Android 하드웨어 백버튼 차단)
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('[LEAGUE_RESULT_DETAIL] 뒤로가기 차단됨');
      return true; // true 반환하면 기본 동작 차단
    });

    return () => backHandler.remove();
  }, []);

  // resultData가 없으면 리그 메인으로 리다이렉트
  if (!params.resultData) {
    console.warn('[LEAGUE_RESULT_DETAIL] resultData 없음, 리다이렉트');
    return <Redirect href={'/(tabs)/league' as any} />;
  }

  // JSON 파싱
  let result: LeagueResult;
  try {
    result = JSON.parse(params.resultData) as LeagueResult;
  } catch (error) {
    console.error('[LEAGUE_RESULT_DETAIL] JSON 파싱 실패:', error);
    return <Redirect href={'/(tabs)/league' as any} />;
  }

  console.log('🏆 [LEAGUE_RESULT_DETAIL] 리그 결과 상세 화면 렌더링');

  return <LeagueResultDetailView result={result} />;
}
