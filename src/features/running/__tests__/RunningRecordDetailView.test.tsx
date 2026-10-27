import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { screen } from '@testing-library/react-native';
import { i18n } from '~/i18n';
import type { RunningRecord } from '~/features/running/models';
import type { RunningRecordItemResponse } from '~/features/running/services/runningService';
import { RunningRecordDetailView } from '~/features/running/views/RunningRecordDetailView';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockMapViewProps = jest.fn();
const mockUseGetRunningRecord = jest.fn();
const mockUseGetRunningRecordItems = jest.fn();
const mockUseUpdateRunningRecordShoe = jest.fn();
const mockUseShoeViewModel = jest.fn();

interface TestNode {
  props: {
    style?: StyleProp<ViewStyle>;
  };
  parent: TestNode | null;
}

const findHeaderContainer = (node: TestNode): TestNode | null => {
  let current: TestNode | null = node;

  while (current) {
    const style = StyleSheet.flatten(current.props.style);
    if (style?.flexDirection === 'row' && style?.justifyContent === 'space-between') {
      return current;
    }

    current = current.parent;
  }

  return null;
};

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: '101' }),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: ({ children, ...props }: { children?: React.ReactNode }) => {
      mockMapViewProps(props);
      return React.createElement(View, null, children);
    },
    Marker: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children),
    Polyline: () => null,
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('~/features/running/services/runningQueries', () => ({
  useGetRunningRecord: (...args: unknown[]) => mockUseGetRunningRecord(...args),
  useGetRunningRecordItems: (...args: unknown[]) => mockUseGetRunningRecordItems(...args),
  useUpdateRunningRecordShoe: (...args: unknown[]) =>
    mockUseUpdateRunningRecordShoe(...args),
}));

jest.mock('~/features/shoes/viewmodels', () => ({
  useShoeViewModel: () => mockUseShoeViewModel(),
}));

jest.mock('~/features/running/views/shoe-selection-area', () => ({
  ShoeSnapCarousel: () => null,
}));

const baseRecord: RunningRecord = {
  id: 101,
  shoeId: null,
  connectedShoe: null,
  distance: 5000,
  steps: 5000,
  cadence: 170,
  heartRate: 145,
  calorie: 300,
  durationSec: 1500,
  startTimestamp: 1735689600,
};

const routeItems: RunningRecordItemResponse[] = [{
  distance: 0,
  durationSec: 0,
  cadence: 0,
  heartRate: 0,
  minHeartRate: 0,
  maxHeartRate: 0,
  orderIndex: 0,
  startTimeStamp: 0,
  endTimeStamp: 0,
  gpsPoints: [
    { latitude: 37.5665, longitude: 126.978, timestampMs: 1735689600000, speed: 0, altitude: 0 },
    { latitude: 37.567, longitude: 126.979, timestampMs: 1735689660000, speed: 0, altitude: 0 },
  ],
}];

describe('RunningRecordDetailView', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('ko');

    mockUseGetRunningRecord.mockReturnValue({
      isLoading: false,
      isError: false,
      data: baseRecord,
    });
    mockUseGetRunningRecordItems.mockReturnValue({
      isSuccess: true,
      data: routeItems,
    });
    mockUseUpdateRunningRecordShoe.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      reset: jest.fn(),
    });
    mockUseShoeViewModel.mockReturnValue({
      shoes: [],
      isLoadingShoes: false,
      hasError: false,
    });
  });

  it('renders the route map below the header instead of overlaying the header', () => {
    renderWithProviders(<RunningRecordDetailView />);

    const headerTitle = screen.getByText('러닝 기록');
    const header = findHeaderContainer(headerTitle);

    expect(header).not.toBeNull();
    const headerStyle = StyleSheet.flatten(header?.props.style);

    expect(headerStyle?.position).toBeUndefined();
    expect(headerStyle?.backgroundColor).toBe('#F7F8F6');
  });

  it('forces the route map to use the light standard map style', () => {
    renderWithProviders(<RunningRecordDetailView />);

    expect(mockMapViewProps).toHaveBeenCalledWith(expect.objectContaining({
      mapType: 'standard',
      userInterfaceStyle: 'light',
    }));
  });

  it.each([
    { variant: 'route manual', items: routeItems, recordingMethod: 'MANUAL', pointExclusionReason: 'MANUAL_ENTRY', message: '수동 입력 기록이라 포인트·리그에 반영되지 않았어요.' },
    { variant: 'no-route manual', items: [], recordingMethod: 'MANUAL', pointExclusionReason: 'MANUAL_ENTRY', message: '수동 입력 기록이라 포인트·리그에 반영되지 않았어요.' },
    { variant: 'route unknown', items: routeItems, recordingMethod: 'UNKNOWN', pointExclusionReason: 'RECORDING_METHOD_UNKNOWN', message: '기기 측정 여부를 확인할 수 없어 개인 기록으로 저장했어요.' },
    { variant: 'no-route unknown', items: [], recordingMethod: 'UNKNOWN', pointExclusionReason: 'RECORDING_METHOD_UNKNOWN', message: '기기 측정 여부를 확인할 수 없어 개인 기록으로 저장했어요.' },
  ] as const)('shows the Health writer name and persisted reason for $variant', ({ items, recordingMethod, pointExclusionReason, message }) => {
    const record: RunningRecord = {
      ...baseRecord, source: 'HEALTH', sourceAppId: 'example.writer.bundle', sourceAppName: 'Sample Runner',
      recordingMethod, pointExclusionReason, acceptanceStatus: 'PERSONAL_ONLY', pointEligible: false, pointAwarded: false,
    };
    mockUseGetRunningRecord.mockReturnValue({ isLoading: false, isError: false, data: record });
    mockUseGetRunningRecordItems.mockReturnValue({ isSuccess: true, data: items });

    renderWithProviders(<RunningRecordDetailView />);

    expect(screen.getByText('건강 연동 · Sample Runner')).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText('example.writer.bundle')).toBeNull();
    expect(screen.queryByText('기기 측정')).toBeNull();
    expect(screen.queryByText('수동 입력')).toBeNull();
    expect(screen.queryByText('측정 방식 확인 불가')).toBeNull();
  });

  it.each([
    { source: 'LIVE', label: '앱 기록' },
    { source: 'GARMIN', label: '가민 직접 연동' },
    { source: 'APPLE_WATCH', label: 'Apple Watch' },
    { source: 'WEAR_OS', label: 'Wear OS' },
  ] as const)('shows $source as its source without inferring a recording method', ({ source, label }) => {
    mockUseGetRunningRecord.mockReturnValue({ data: { ...baseRecord, source, recordingMethod: null } });

    renderWithProviders(<RunningRecordDetailView />);

    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByText('기기 측정')).toBeNull();
    expect(screen.queryByText('측정 방식 확인 불가')).toBeNull();
  });

  it.each([null, undefined, '   '])('shows Health without guessing a writer from its raw app ID when the name is %s', (sourceAppName) => {
    mockUseGetRunningRecord.mockReturnValue({ data: {
      ...baseRecord, source: 'HEALTH', sourceAppId: 'com.example.watch', sourceAppName, recordingMethod: null,
    } });

    renderWithProviders(<RunningRecordDetailView />);

    expect(screen.getByText('건강 연동')).toBeTruthy();
    expect(screen.queryByText('com.example.watch')).toBeNull();
    expect(screen.queryByText('Apple Watch')).toBeNull();
    expect(screen.queryByText('기기 측정')).toBeNull();
  });

  it('describes the point cutoff without claiming the record was excluded from the league', () => {
    mockUseGetRunningRecord.mockReturnValue({ data: {
      ...baseRecord, source: 'HEALTH', recordingMethod: 'RECORDED', pointEligible: false,
      pointExclusionReason: 'BEFORE_POINT_CUTOFF', acceptanceStatus: 'ACCEPTED',
    } });

    renderWithProviders(<RunningRecordDetailView />);

    expect(screen.getByText('포인트 지급 기준 시각 이전 기록이에요.')).toBeTruthy();
    expect(screen.getByText('기기 측정')).toBeTruthy();
    expect(screen.queryByText(/포인트·리그/)).toBeNull();
  });

  it('shows the persisted overlap reason without recalculating eligibility', () => {
    mockUseGetRunningRecord.mockReturnValue({ data: {
      ...baseRecord, source: 'GARMIN', pointEligible: false, pointExclusionReason: 'OVERLAPPING_ACTIVITY',
    } });

    renderWithProviders(<RunningRecordDetailView />);

    expect(screen.getByText('이미 인정된 러닝과 시간이 겹쳐 포인트·리그에 반영되지 않았어요.')).toBeTruthy();
  });

  it.each([null, undefined, 'FUTURE_SERVER_REASON'])('does not infer a missing or unknown exclusion reason %s', (pointExclusionReason) => {
    mockUseGetRunningRecord.mockReturnValue({ data: {
      ...baseRecord, source: 'HEALTH', pointEligible: false, pointExclusionReason, recordingMethod: null,
    } });

    renderWithProviders(<RunningRecordDetailView />);

    expect(screen.getByText('포인트 제외 사유 정보가 없어요.')).toBeTruthy();
    expect(screen.queryByText('수동 입력 기록이라 포인트·리그에 반영되지 않았어요.')).toBeNull();
    expect(screen.queryByText('포인트 지급 기준 시각 이전 기록이에요.')).toBeNull();
    expect(screen.queryByText('기기 측정 여부를 확인할 수 없어 개인 기록으로 저장했어요.')).toBeNull();
  });

  it.each([true, undefined])('does not treat zero awarded points as an exclusion when eligibility is %s', (pointEligible) => {
    mockUseGetRunningRecord.mockReturnValue({ data: {
      ...baseRecord, distance: 50, source: 'GARMIN', pointEligible, pointAwarded: false, pointExclusionReason: null,
    } });

    renderWithProviders(<RunningRecordDetailView />);

    expect(screen.getByText('가민 직접 연동')).toBeTruthy();
    expect(screen.queryByText('포인트 제외 사유 정보가 없어요.')).toBeNull();
    expect(screen.queryByText(/개인 기록으로 저장|포인트·리그에 반영|포인트 지급 기준/)).toBeNull();
  });

  it('preserves an explicit awarded state when legacy eligibility or reason metadata is incomplete', () => {
    mockUseGetRunningRecord.mockReturnValue({ data: {
      ...baseRecord, source: 'HEALTH', recordingMethod: 'RECORDED',
      pointEligible: false, pointAwarded: true, pointExclusionReason: null,
    } });

    renderWithProviders(<RunningRecordDetailView />);

    expect(screen.getByText('건강 연동')).toBeTruthy();
    expect(screen.getByText('기기 측정')).toBeTruthy();
    expect(screen.queryByText('포인트 제외 사유 정보가 없어요.')).toBeNull();
    expect(screen.queryByText(/개인 기록으로 저장|포인트·리그에 반영|포인트 지급 기준/)).toBeNull();
  });

  it('does not describe a pending record as reward-excluded', () => {
    const record: RunningRecord = {
      ...baseRecord, source: 'HEALTH', acceptanceStatus: 'PENDING', recordingMethod: 'MANUAL',
      pointEligible: false, pointExclusionReason: 'MANUAL_ENTRY', pointAwarded: false,
    };
    mockUseGetRunningRecord.mockReturnValue({ data: record });

    renderWithProviders(<RunningRecordDetailView />);

    expect(screen.getByText('건강 연동')).toBeTruthy();
    expect(screen.getByText('수동 입력')).toBeTruthy();
    expect(screen.queryByText('수동 입력 기록이라 포인트·리그에 반영되지 않았어요.')).toBeNull();
    expect(screen.queryByText('포인트 제외 사유 정보가 없어요.')).toBeNull();
  });

  it.each([
    { variant: 'route', items: routeItems },
    { variant: 'no route', items: [] },
  ])('keeps legacy $variant details working when provenance fields are absent', ({ items }) => {
    mockUseGetRunningRecordItems.mockReturnValue({ isSuccess: true, data: items });

    renderWithProviders(<RunningRecordDetailView />);

    expect(screen.getByText('오늘의 러닝 거리')).toBeTruthy();
    expect(screen.getByText('총 시간')).toBeTruthy();
    expect(screen.queryByText(/건강 연동|가민 직접 연동|앱 기록|Apple Watch|Wear OS/)).toBeNull();
    expect(screen.queryByText('측정 방식 확인 불가')).toBeNull();
    expect(screen.queryByText('포인트 제외 사유 정보가 없어요.')).toBeNull();
  });

  it('interpolates the Health writer name and exclusion reason in Japanese', async () => {
    await i18n.changeLanguage('ja');
    mockUseGetRunningRecord.mockReturnValue({ data: {
      ...baseRecord, source: 'HEALTH', sourceAppName: 'Sample Runner', pointEligible: false,
      pointExclusionReason: 'MANUAL_ENTRY', recordingMethod: 'MANUAL',
    } });
    const { unmount } = renderWithProviders(<RunningRecordDetailView />);

    expect(screen.getByText('ヘルスケア連携 · Sample Runner')).toBeTruthy();
    expect(screen.getByText('手動入力の記録のため、ポイント・リーグには反映されませんでした。')).toBeTruthy();
    unmount();
    await i18n.changeLanguage('ko');
  });

  it('renders kilometer split rows at the bottom with pace, heart rate, and cadence', () => {
    mockUseGetRunningRecordItems.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: [
        {
          distance: 600,
          durationSec: 180,
          cadence: 160,
          heartRate: 140,
          minHeartRate: 0,
          maxHeartRate: 0,
          orderIndex: 0,
          startTimeStamp: 0,
          endTimeStamp: 0,
          gpsPoints: [],
        },
        {
          distance: 400,
          durationSec: 120,
          cadence: 170,
          heartRate: 150,
          minHeartRate: 0,
          maxHeartRate: 0,
          orderIndex: 1,
          startTimeStamp: 0,
          endTimeStamp: 0,
          gpsPoints: [],
        },
        {
          distance: 360,
          durationSec: 108,
          cadence: 0,
          heartRate: 0,
          minHeartRate: 0,
          maxHeartRate: 0,
          orderIndex: 2,
          startTimeStamp: 0,
          endTimeStamp: 0,
          gpsPoints: [],
        },
      ],
    });

    const result = renderWithProviders(<RunningRecordDetailView />);

    expect(screen.getByText('구간 기록')).toBeTruthy();
    expect(screen.getByText('1.00 km')).toBeTruthy();
    expect(screen.getByText('마지막 0.36 km')).toBeTruthy();
    expect(screen.getAllByText('5\'00"/km')).toHaveLength(2);
    expect(screen.queryByText('5:00')).toBeNull();
    expect(screen.queryByText('1:48')).toBeNull();
    expect(screen.getByText('144 bpm')).toBeTruthy();
    expect(screen.getByText('164 spm')).toBeTruthy();
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(2);

    const rendered = JSON.stringify(result.toJSON());
    expect(rendered.indexOf('연결된 신발이 없어요')).toBeLessThan(
      rendered.indexOf('구간 기록')
    );
  });
});
