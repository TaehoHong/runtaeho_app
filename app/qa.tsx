import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { useAuthStore, waitForAuthHydration } from '~/features/auth/stores/authStore';
import { UI_QA_ENABLED } from '~/qa/config';
import { Text } from '~/shared/components/typography';

/** Local QA entry: runtaeho-dev://qa?scenario=populated . No production login path. */
export default function QaEntry() {
  const { scenario = 'populated' } = useLocalSearchParams<{ scenario: string }>();
  const { completeLogin, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!UI_QA_ENABLED) return;
    let active = true;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fixture = require('~/qa/fixtures') as typeof import('~/qa/fixtures');
      await waitForAuthHydration();
      if (!active) return;
      fixture.configureQaScenario(scenario);
      if (scenario === 'guest') { await logout(); router.replace('/auth/login'); return; }
      const tokens = fixture.qaTokens();
      await completeLogin(tokens.accessToken, tokens.refreshToken, useAuthStore.getState().beginLoginAttempt());
    })().catch(value => { if (active) setError(String(value)); });
    return () => { active = false; };
  }, [scenario, completeLogin, logout]);
  if (!UI_QA_ENABLED) return <Redirect href="/auth/login" />;
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    {error ? <Text>{error}</Text> : <ActivityIndicator />}
  </View>;
}
