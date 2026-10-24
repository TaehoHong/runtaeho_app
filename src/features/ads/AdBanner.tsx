import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Text } from '~/shared/components/typography';
import { GREY } from '~/shared/styles';
import { t, useAppLanguage } from '~/i18n';
import { useAds } from './AdsProvider';

export function AdBanner({ visible = true }: { visible?: boolean }) {
  const { sdk, ready, bannerId } = useAds();
  if (!sdk || !ready || !visible) return null;
  return <ActiveBanner sdk={sdk} bannerId={bannerId} />;
}

function ActiveBanner({ sdk, bannerId }: {
  sdk: NonNullable<ReturnType<typeof useAds>['sdk']>;
  bannerId: string;
}) {
  useAppLanguage();
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => { setFailed(false); }, [focused, foreground]);
  if (!focused || !foreground) return null;
  const Banner = sdk.BannerAd;
  return <View style={styles.container} testID="ad-banner">
    {!failed && <>
      <Text style={styles.label}>{t('광고')}</Text>
      <Banner unitId={bannerId} size={sdk.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => { setFailed(true); console.warn('[Ads] Banner unavailable'); }} />
    </>}
  </View>;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 90,
    paddingVertical: 12, marginVertical: 16, borderTopWidth: 1, borderColor: GREY[100] },
  label: { color: GREY[600], fontSize: 11, marginBottom: 4 },
});
