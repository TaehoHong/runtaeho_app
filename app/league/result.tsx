/**
 * 리그 결과 화면 라우트
 * /league/result
 */

import { useLocalSearchParams, Redirect } from 'expo-router';
import { LeagueResultView } from '~/features/league/views';
import type { LeagueResult } from '~/features/league/models';

export default function LeagueResultScreen() {
  const params = useLocalSearchParams<{ resultData?: string }>();

  // resultData가 없으면 리그 메인으로 리다이렉트
  if (!params.resultData) {
    console.warn('[LEAGUE_RESULT] resultData 없음, 리다이렉트');
    return <Redirect href={'/(tabs)/league' as any} />;
  }

  // JSON 파싱
  let result: LeagueResult;
  try {
    result = JSON.parse(params.resultData) as LeagueResult;
  } catch (error) {
    console.error('[LEAGUE_RESULT] JSON 파싱 실패:', error);
    return <Redirect href={'/(tabs)/league' as any} />;
  }

  console.log('🏆 [LEAGUE_RESULT] 리그 결과 화면 렌더링', result.resultStatus);

  return <LeagueResultView result={result} />;
}
