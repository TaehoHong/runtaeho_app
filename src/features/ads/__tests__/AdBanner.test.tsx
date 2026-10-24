import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { AdBanner } from '../AdBanner';

let mockFocused = true;
let mockReady = true;
const mockBanner = jest.fn();
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('../AdsProvider', () => ({
  useAds: () => ({
    ready: mockReady,
    bannerId: 'test-banner',
    sdk: {
      BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'adaptive' },
      BannerAd: (props: { onAdFailedToLoad: () => void }) => {
        const { View } = require('react-native');
        mockBanner(props);
        return <View testID="native-banner" {...props} />;
      },
    },
  }),
}));

describe('AdBanner visibility', () => {
  let onAppState: (state: AppStateStatus) => void;
  const remove = jest.fn();
  beforeEach(() => {
    mockFocused = true;
    mockReady = true;
    AppState.currentState = 'active';
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
      onAppState = callback;
      return { remove };
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('does not request ads before consent or behind another screen', () => {
    mockReady = false;
    const { rerender } = render(<AdBanner />);
    expect(mockBanner).not.toHaveBeenCalled();
    mockReady = true;
    mockFocused = false;
    rerender(<AdBanner />);
    expect(mockBanner).not.toHaveBeenCalled();
    mockFocused = true;
    rerender(<AdBanner visible={false} />);
    expect(mockBanner).not.toHaveBeenCalled();
  });

  it('requests non-personalized ads and removes them in the background', () => {
    const { unmount } = render(<AdBanner />);
    expect(mockBanner).toHaveBeenCalledWith(expect.objectContaining({
      unitId: 'test-banner', requestOptions: { requestNonPersonalizedAdsOnly: true },
    }));
    act(() => onAppState('background'));
    expect(screen.queryByTestId('native-banner')).toBeNull();
    act(() => onAppState('active'));
    expect(screen.getByTestId('native-banner')).toBeTruthy();
    unmount();
    expect(remove).toHaveBeenCalled();
  });

  it('keeps the reserved area after a failed load without automatic retry loops', () => {
    render(<AdBanner />);
    fireEvent(screen.getByTestId('native-banner'), 'adFailedToLoad');
    expect(screen.queryByTestId('native-banner')).toBeNull();
    expect(screen.getByTestId('ad-banner')).toBeTruthy();
  });
});
