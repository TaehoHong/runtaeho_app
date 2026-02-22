import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useBottomActionOffset } from '~/shared/hooks/useBottomActionOffset';

const mockUseSafeAreaInsets = jest.fn();

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => mockUseSafeAreaInsets(),
  };
});

describe('useBottomActionOffset', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    mockUseSafeAreaInsets.mockReturnValue({ top: 0, right: 0, bottom: 24, left: 0 });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
  });

  it('adds bottom inset on android', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const { result } = renderHook(() => useBottomActionOffset(32));
    expect(result.current).toBe(56);
  });

  it('keeps base offset on ios', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const { result } = renderHook(() => useBottomActionOffset(32));
    expect(result.current).toBe(32);
  });
});
