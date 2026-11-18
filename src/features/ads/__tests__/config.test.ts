import configuration from '../../../../app.json';
import { getAdConfiguration } from '../config';

describe('ad configuration', () => {
  const original = JSON.stringify(configuration);
  afterEach(() => Object.assign(configuration, JSON.parse(original)));

  it('allows native development builds and excludes web', () => {
    expect(getAdConfiguration('ios', true)?.development).toBe(true);
    expect(getAdConfiguration('android', true)?.development).toBe(true);
    expect(getAdConfiguration('web', true)).toBeNull();
  });

  it('enables release banners with a production app and banner ID on the same platform', () => {
    configuration.ads.enabled = false;
    configuration.ads.ios.rewardedId = '';
    configuration['react-native-google-mobile-ads'].ios_app_id = 'ca-app-pub-3940256099942544~1458002511';
    configuration.ads.ios.bannerId = 'ca-app-pub-1234567890123456/1234567890';
    expect(getAdConfiguration('ios', false)).toBeNull();
    configuration.ads.enabled = true;
    expect(getAdConfiguration('ios', false)).toBeNull();
    configuration['react-native-google-mobile-ads'].ios_app_id = 'ca-app-pub-1234567890123456~1234567890';
    expect(getAdConfiguration('ios', false)?.bannerId).toBe(configuration.ads.ios.bannerId);
    configuration.ads.ios.bannerId = 'ca-app-pub-3940256099942544/2934735716';
    expect(getAdConfiguration('ios', false)).toBeNull();
    configuration.ads.android.bannerId = '';
    expect(getAdConfiguration('android', false)).toBeNull();
  });
});
