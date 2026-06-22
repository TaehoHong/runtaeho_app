import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { screen } from '@testing-library/react-native';
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

describe('RunningRecordDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGetRunningRecord.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
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
      },
    });
    mockUseGetRunningRecordItems.mockReturnValue({
      isSuccess: true,
      data: [
        {
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
            {
              latitude: 37.5665,
              longitude: 126.978,
              timestampMs: 1735689600000,
              speed: 0,
              altitude: 0,
            },
            {
              latitude: 37.567,
              longitude: 126.979,
              timestampMs: 1735689660000,
              speed: 0,
              altitude: 0,
            },
          ],
        },
      ],
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
});
