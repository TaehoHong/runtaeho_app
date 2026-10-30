import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Text } from '~/shared/components/typography';
import { GREY } from '~/shared/styles';
import { t, useAppLanguage } from '~/i18n';
import { useAds } from './AdsProvider';

export function AdBanner({ visible = true }: { visible?: boolean }) {
  const { sdk, ready, bannerId } = useAds();
  if (!sdk || !ready) return null;
  return <ActiveBanner sdk={sdk} bannerId={bannerId} visible={visible} />;
}

function ActiveBanner({ sdk, bannerId, visible }: {
  sdk: NonNullable<ReturnType<typeof useAds>['sdk']>;
  bannerId: string;
  visible: boolean;
}) {
  useAppLanguage();
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const active = focused && foreground && visible;
  const [hasActivated, setHasActivated] = useState(active);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (active) {
      setHasActivated(true);
      setFailed(false);
    }
  }, [active]);
  if (!hasActivated) return null;
  const Banner = sdk.BannerAd;
  // Visibility changes preserve the loaded native ad; consent readiness owns disposal.
  return <View style={[styles.container, !active && styles.hidden]} testID="ad-banner">
    {!failed && <>
      <Text style={styles.label}>{t('광고')}</Text>
      <Banner unitId={bannerId} size={sdk.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => { setFailed(true); console.warn('[Ads] Banner unavailable'); }} />
    </>}
  </View>;
}

const styles = StyleSheet.create({
  hidden: { display: 'none' },
  container: { alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 90,
    paddingVertical: 12, marginVertical: 16, borderTopWidth: 1, borderColor: GREY[100] },
  label: { color: GREY[600], fontSize: 11, marginBottom: 4 },
});
