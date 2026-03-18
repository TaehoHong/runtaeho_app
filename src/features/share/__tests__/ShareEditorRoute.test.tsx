import React from 'react';
import { BackHandler, type NativeEventSubscription } from 'react-native';
import { screen } from '@testing-library/react-native';
import ShareEditorPage from '../../../../app/share/editor';
import { routerMock } from '~/test-utils/mocks/native';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockClearShareData = jest.fn();
const mockBackHandlerRemove = jest.fn();
let hardwareBackPressHandler: (() => boolean | null | undefined) | null = null;
let mockShareData: {
  distance: number;
  durationSec: number;
  pace: string;
  startTimestamp: string;
  earnedPoints: number;
  locations: [];
} | null = null;

jest.mock('~/features/share', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    ShareEditorScreen: () => React.createElement(View, { testID: 'share-editor-page-screen' }),
  };
});

jest.mock('~/features/share/stores/shareStore', () => ({
  useShareStore: (
    selector: (state: {
      shareData: typeof mockShareData;
      clearShareData: typeof mockClearShareData;
    }) => unknown
  ) => selector({
    shareData: mockShareData,
    clearShareData: mockClearShareData,
  }),
}));

describe('ShareEditorPage navigation policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShareData = {
      distance: 5000,
      durationSec: 1500,
      pace: '5:00',
      startTimestamp: '2026-02-24T00:00:00.000Z',
      earnedPoints: 50,
      locations: [],
    };
    hardwareBackPressHandler = null;

    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((eventName, handler) => {
      if (eventName === 'hardwareBackPress') {
        hardwareBackPressHandler = handler;
      }

      return { remove: mockBackHandlerRemove } as NativeEventSubscription;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('blocks Android hardware back while the share editor route is mounted', () => {
    renderWithProviders(<ShareEditorPage />);

    expect(screen.getByTestId('share-editor-page-screen')).toBeTruthy();
    expect(hardwareBackPressHandler).not.toBeNull();
    expect(hardwareBackPressHandler?.()).toBe(true);
  });

  it('clears share data and removes the hardware back handler on unmount', () => {
    const { unmount } = renderWithProviders(<ShareEditorPage />);

    expect(mockBackHandlerRemove).not.toHaveBeenCalled();
    expect(mockClearShareData).not.toHaveBeenCalled();

    unmount();

    expect(mockBackHandlerRemove).toHaveBeenCalledTimes(1);
    expect(mockClearShareData).toHaveBeenCalledTimes(1);
  });

  it('navigates back immediately when share data is missing', () => {
    mockShareData = null;

    renderWithProviders(<ShareEditorPage />);

    expect(routerMock.back).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('share-editor-page-screen')).toBeNull();
  });
});
