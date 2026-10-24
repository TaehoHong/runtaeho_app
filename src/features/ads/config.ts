import configuration from '../../../app.json';

export type AdsPlatform = 'ios' | 'android';

export function getAdConfiguration(platform: string, development: boolean) {
  if (platform !== 'ios' && platform !== 'android') return null;
  const units = configuration.ads[platform];
  const nativeId = configuration['react-native-google-mobile-ads'][`${platform}_app_id`];
  const isProductionId = (id: string, separator: '~' | '/') => new RegExp(`^ca-app-pub-\\d+${separator}\\d+$`).test(id)
    && !id.startsWith('ca-app-pub-3940256099942544');
  if (!development && (!configuration.ads.enabled || !isProductionId(nativeId, '~')
    || !isProductionId(units.bannerId, '/') || !isProductionId(units.rewardedId, '/'))) return null;
  return { ...units, development };
}
