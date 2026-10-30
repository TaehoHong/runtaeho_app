import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { RunningState, useAppStore } from '~/stores/app/appStore';
import { useLeagueCheckStore } from '~/stores/league/leagueCheckStore';

/** Focused tabs share one result claim; active runs keep the result pending. */
export const useLeagueResultNavigation = () => {
  const isFocused = useIsFocused();
  const router = useRouter();
  const runningState = useAppStore(state => state.runningState);
  const pendingResult = useLeagueCheckStore(state => state.pendingResult);

  useEffect(() => {
    if (!isFocused || useAppStore.getState().runningState !== RunningState.Stopped) return;
    // Read and remove together: another mounted tab may have claimed this render's result.
    const result = useLeagueCheckStore.getState().consumePendingResult();
    if (!result) return;
    router.push({
      pathname: '/league/result' as const,
      params: { resultData: JSON.stringify(result) },
    } as any);
  }, [isFocused, pendingResult, router, runningState]);
};
