import React from 'react';
import { act, render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import LeagueResultScreen from '@/league/result';
import LeagueResultDetailScreen from '@/league/result-detail';

let mockFocused = true;
const mockSetOptions = jest.fn();
const mockHandlers = new Set<() => boolean | null | undefined>();
jest.mock('expo-router', () => ({
  useNavigation: () => ({ setOptions: mockSetOptions }),
  useLocalSearchParams: () => ({ resultData: '{}' }),
  useFocusEffect: (effect: React.EffectCallback) => {
    require('react').useEffect(() => mockFocused ? effect() : undefined, [mockFocused, effect]);
  },
}));
jest.mock('~/features/league/models/parseLeagueResult', () => ({ parseLeagueResult: () => ({ resultStatus: 'MAINTAINED' }) }));
jest.mock('~/features/league/views', () => ({ LeagueResultView: () => null, LeagueResultDetailView: () => null }));

beforeEach(() => {
  mockFocused = true;
  mockHandlers.clear();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    mockHandlers.add(handler);
    return { remove: () => { mockHandlers.delete(handler); } };
  });
});
afterEach(() => { jest.restoreAllMocks(); });

it.each([
  ['result', LeagueResultScreen],
  ['result detail', LeagueResultDetailScreen],
])('blocks back only while %s is focused and releases it for an overlaid notification', (_name, Screen) => {
  const screen = render(<Screen />);
  expect([...mockHandlers].some(handler => handler() === true)).toBe(true);

  mockFocused = false;
  act(() => { screen.rerender(<Screen />); });
  expect([...mockHandlers].some(handler => handler() === true)).toBe(false);

  mockFocused = true;
  act(() => { screen.rerender(<Screen />); });
  expect([...mockHandlers].some(handler => handler() === true)).toBe(true);
  screen.unmount();
  expect(mockHandlers.size).toBe(0);
});
