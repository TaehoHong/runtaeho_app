import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform, TurboModuleRegistry } from 'react-native';
import { getSessionSnapshot, isSessionCurrent, useAuthStore } from '~/features/auth/stores/authStore';
import { getAdConfiguration } from './config';

type AdsSdk = typeof import('react-native-google-mobile-ads');
interface AdsContextValue {
  sdk: AdsSdk | null;
  ready: boolean;
  bannerId: string;
  rewardedId: string;
  privacyRequired: boolean;
  showPrivacyOptions: () => Promise<void>;
}
const AdsContext = createContext<AdsContextValue>({
  sdk: null, ready: false, bannerId: '', rewardedId: '', privacyRequired: false,
  showPrivacyOptions: async () => {},
});

// Older installed binaries and web must not import a module requiring native bindings.
const configuration = getAdConfiguration(Platform.OS, __DEV__);
const sdk: AdsSdk | null = configuration && TurboModuleRegistry.get('RNGoogleMobileAdsModule')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('react-native-google-mobile-ads') : null;

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const loggedIn = useAuthStore(state => state.isLoggedIn);
  const [ready, setReady] = useState(false);
  const [privacyRequired, setPrivacyRequired] = useState(false);

  const showPrivacyOptions = useCallback(async () => {
    if (!sdk) return;
    const session = getSessionSnapshot();
    setReady(false);
    const info = await sdk.AdsConsent.showPrivacyOptionsForm();
    if (!isSessionCurrent(session)) return;
    setPrivacyRequired(info.privacyOptionsRequirementStatus === 'REQUIRED');
    if (!info.canRequestAds) return;
    await sdk.default().initialize();
    if (isSessionCurrent(session)) setReady(true);
  }, []);

  useEffect(() => {
    if (!loggedIn || !sdk) { setReady(false); return; }
    let active = true;
    void sdk.AdsConsent.gatherConsent().then(async info => {
      if (!active) return;
      setPrivacyRequired(info.privacyOptionsRequirementStatus === 'REQUIRED');
      if (!info.canRequestAds) return;
      await sdk.default().initialize();
      if (active) setReady(true);
    }).catch(() => {
      if (active) setReady(false);
      console.warn('[Ads] Consent or initialization unavailable');
    });
    return () => { active = false; };
  }, [loggedIn]);

  return <AdsContext.Provider value={{
    sdk, ready: ready && loggedIn,
    bannerId: configuration?.development ? sdk?.TestIds.ADAPTIVE_BANNER ?? '' : configuration?.bannerId ?? '',
    rewardedId: configuration?.development ? sdk?.TestIds.REWARDED ?? '' : configuration?.rewardedId ?? '',
    privacyRequired, showPrivacyOptions,
  }}>{children}</AdsContext.Provider>;
}

export const useAds = () => useContext(AdsContext);
