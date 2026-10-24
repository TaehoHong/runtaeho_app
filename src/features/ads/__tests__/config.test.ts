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

  it('keeps release ads disabled until both native and unit IDs are configured', () => {
    expect(getAdConfiguration('ios', false)).toBeNull();
    configuration.ads.enabled = true;
    expect(getAdConfiguration('ios', false)).toBeNull();
    configuration.ads.ios.bannerId = 'ca-app-pub-1234567890123456/1234567890';
    configuration.ads.ios.rewardedId = 'ca-app-pub-1234567890123456/0987654321';
    expect(getAdConfiguration('ios', false)).toBeNull();
    configuration['react-native-google-mobile-ads'].ios_app_id = 'ca-app-pub-1234567890123456~1234567890';
    expect(getAdConfiguration('ios', false)?.bannerId).toBe(configuration.ads.ios.bannerId);
    expect(getAdConfiguration('android', false)).toBeNull();
  });
});
