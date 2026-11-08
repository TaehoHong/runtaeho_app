import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { i18n } from '~/i18n';
import type { RunningRecord } from '~/features/running/models';
import { renderWithProviders } from '~/test-utils/renderWithProviders';
import { RunningRecordCard } from '../RunningRecordCard';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const record: RunningRecord = {
  id: 101, distance: 5120, durationSec: 1800, steps: 5000,
  heartRate: 145, cadence: 172, calorie: 320, startTimestamp: 1735689600,
};

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage('ko');
});

it('names the metrics and units for screen readers and opens the selected record', () => {
  renderWithProviders(<RunningRecordCard record={record} />);

  const card = screen.getByRole('button', { name: /거리 5.12 km.*페이스 5.*52.*km.*총 시간 30:00/ });
  fireEvent.press(card);

  expect(router.push).toHaveBeenCalledWith({ pathname: '/running-record-detail', params: { id: '101' } });
});

it.each([
  { source: 'GARMIN', sourceAppId: null, sourceAppName: null },
  { source: 'HEALTH', sourceAppId: 'com.garmin.android.apps.connectmobile', sourceAppName: 'Garmin Connect' },
] as const)('identifies $source Garmin records without inventing a device model', (metadata) => {
  renderWithProviders(<RunningRecordCard record={{ ...record, ...metadata }} />);

  expect(screen.getByText('Garmin')).toBeTruthy();
  expect(screen.queryByText(/Forerunner/)).toBeNull();
});

it('preserves an unrelated Health writer and does not label it as Garmin', () => {
  renderWithProviders(<RunningRecordCard record={{
    ...record, source: 'HEALTH', sourceAppId: 'example.runner', sourceAppName: 'Sample Runner',
  }} />);

  expect(screen.getByText('건강 연동 · Sample Runner')).toBeTruthy();
  expect(screen.queryByText('Garmin')).toBeNull();
});

it('does not add a source caption to live app records', () => {
  renderWithProviders(<RunningRecordCard record={{ ...record, source: 'LIVE' }} />);

  expect(screen.queryByText('Garmin')).toBeNull();
  expect(screen.queryByText('앱 기록')).toBeNull();
});
