import { i18n, t } from '..';
import { resolveLanguage } from '../language';
import { formatRecordDate, formatToLocalDateTime } from '~/shared/utils/dateUtils';
import { HAIR_COLORS } from '~/features/avatar/models/avatarConstants';
import ko from '../locales/ko.json';
import ja from '../locales/ja.json';

afterEach(async () => { await i18n.changeLanguage('ko'); });

it.each([
  ['system', 'ja-JP', 'ja'],
  ['system', 'en-US', 'ko'],
  ['system', null, 'ko'],
  ['ko', 'ja', 'ko'],
  ['ja', 'ko', 'ja'],
] as const)('resolves %s with device %s to %s', (preference, device, expected) => {
  expect(resolveLanguage(preference, device)).toBe(expected);
});

it('updates static choice labels and interpolated dates without changing API date serialization', async () => {
  const date = new Date(2026, 9, 2, 9, 30);
  const timestamp = date.getTime() / 1000;
  expect(HAIR_COLORS[0].name).toBe('검정');
  await i18n.changeLanguage('ja');
  expect(HAIR_COLORS[0].name).toBe('ブラック');
  expect(formatRecordDate(timestamp)).toBe('2026年10月2日 09:30');
  expect(formatToLocalDateTime(date)).toBe('2026-10-02T09:30:00');
  expect(t('오늘 {{value0}} 달렸어요! #RunTaeho #러닝', { value0: '5 km' }))
    .toBe('今日は5 km走りました！ #RunTaeho #ランニング');
});

it('has Japanese translations with matching interpolation variables for every Korean message', () => {
  expect(Object.keys(ja).sort()).toEqual(Object.keys(ko).sort());
  const placeholders = (value: string) => (value.match(/\{\{[^}]+\}\}/g) ?? []).sort();
  const invalid = Object.entries(ko).filter(([key, value]) => {
    const translated = ja[key as keyof typeof ja];
    return !translated || /[가-힣]/.test(translated) ||
      JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(translated));
  });
  expect(invalid).toEqual([]);
});
