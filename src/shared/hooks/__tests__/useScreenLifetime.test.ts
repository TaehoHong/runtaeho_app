import { renderHook } from '@testing-library/react-native';
import { useScreenLifetime } from '../useScreenLifetime';

let mockFocused = true;
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => require('react').useEffect(() => {
    if (mockFocused) return effect();
  }, [effect, mockFocused]),
}));

it('a screen that regains focus cannot revive a previous focus’s async callbacks', () => {
  const hook = renderHook(() => useScreenLifetime());
  const original = hook.result.current();
  expect(original()).toBe(true);
  mockFocused = false;
  hook.rerender({});
  expect(original()).toBe(false);
  mockFocused = true;
  hook.rerender({});
  expect(original()).toBe(false);
  expect(hook.result.current()()).toBe(true);
});
