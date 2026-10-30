import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { AdBanner } from '../AdBanner';

let mockFocused = true;
let mockReady = true;
const mockBanner = jest.fn();
const mockMount = jest.fn();
const mockDrop = jest.fn();
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('../AdsProvider', () => {
  const React = require('react');
  const { View } = require('react-native');
  const sdk = {
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'adaptive' },
    BannerAd: (props: { onAdFailedToLoad: () => void }) => {
      React.useEffect(() => {
        mockMount();
        return () => mockDrop();
      }, []);
      mockBanner(props);
      return <View testID="native-banner" {...props} />;
    },
  };
  return { useAds: () => ({ ready: mockReady, bannerId: 'test-banner', sdk }) };
});

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

  it('keeps one hidden banner across navigation, modals and background transitions', () => {
    const { rerender, unmount } = render(<AdBanner />);
    expect(mockBanner).toHaveBeenCalledWith(expect.objectContaining({
      unitId: 'test-banner', requestOptions: { requestNonPersonalizedAdsOnly: true },
    }));
    mockFocused = false;
    rerender(<AdBanner />);
    expect(screen.getByTestId('native-banner', { includeHiddenElements: true })).not.toBeVisible();
    mockFocused = true;
    rerender(<AdBanner />);
    expect(screen.getByTestId('native-banner')).toBeVisible();
    rerender(<AdBanner visible={false} />);
    expect(screen.getByTestId('native-banner', { includeHiddenElements: true })).not.toBeVisible();
    rerender(<AdBanner />);
    act(() => onAppState('background'));
    expect(screen.getByTestId('native-banner', { includeHiddenElements: true })).not.toBeVisible();
    act(() => onAppState('active'));
    expect(screen.getByTestId('native-banner')).toBeVisible();
    expect(mockMount).toHaveBeenCalledTimes(1);
    expect(mockDrop).not.toHaveBeenCalled();
    unmount();
    expect(mockDrop).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalled();
  });

  it('releases a retained banner when consent readiness is revoked', () => {
    const { rerender } = render(<AdBanner />);
    mockFocused = false;
    rerender(<AdBanner />);
    mockReady = false;
    rerender(<AdBanner />);
    expect(screen.queryByTestId('native-banner', { includeHiddenElements: true })).toBeNull();
    expect(mockDrop).toHaveBeenCalledTimes(1);
    mockReady = true;
    rerender(<AdBanner />);
    expect(mockMount).toHaveBeenCalledTimes(1);
  });

  it('keeps the reserved area after failure and retries only on the next active display', () => {
    const { rerender } = render(<AdBanner />);
    fireEvent(screen.getByTestId('native-banner'), 'adFailedToLoad');
    expect(screen.queryByTestId('native-banner')).toBeNull();
    expect(screen.getByTestId('ad-banner')).toBeTruthy();
    rerender(<AdBanner />);
    expect(mockMount).toHaveBeenCalledTimes(1);
    mockFocused = false;
    rerender(<AdBanner />);
    expect(mockMount).toHaveBeenCalledTimes(1);
    mockFocused = true;
    rerender(<AdBanner />);
    expect(screen.getByTestId('native-banner')).toBeVisible();
    expect(mockMount).toHaveBeenCalledTimes(2);
  });
});
