import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Animated, AppState, type AppStateStatus } from 'react-native';
import { LeagueNotJoinedView } from '../LeagueNotJoinedView';

let mockFocused = true;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));

describe('LeagueNotJoinedView activity lifetime', () => {
  const runningAnimations = new Set<Animated.CompositeAnimation>();
  const animationsByValue = new Map<Parameters<typeof Animated.timing>[0], Animated.CompositeAnimation>();
  const starts = jest.fn();
  const listeners = new Set<(state: AppStateStatus) => void>();
  const emitAppState = (state: AppStateStatus) => {
    AppState.currentState = state;
    listeners.forEach(listener => listener(state));
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockFocused = true;
    AppState.currentState = 'active';
    runningAnimations.clear();
    animationsByValue.clear();
    listeners.clear();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    });
    // Observe requested animation work without native animation frames.
    jest.spyOn(Animated, 'timing').mockImplementation(value => {
      const animation: Animated.CompositeAnimation = {
        start: () => {
          animationsByValue.get(value)?.stop();
          animationsByValue.set(value, animation);
          starts();
          runningAnimations.add(animation);
        },
        stop: () => { runningAnimations.delete(animation); },
        reset: () => {},
      };
      return animation;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('does not animate a screen mounted without focus', () => {
    mockFocused = false;
    render(<LeagueNotJoinedView />);
    act(() => jest.advanceTimersByTime(10000));
    expect(starts).not.toHaveBeenCalled();
  });

  it('stops in-progress work on blur and resumes only one carousel on refocus', () => {
    const { rerender, unmount } = render(<LeagueNotJoinedView />);
    act(() => jest.advanceTimersByTime(1500));
    expect(starts).toHaveBeenCalledTimes(3);
    mockFocused = false;
    rerender(<LeagueNotJoinedView />);
    expect(runningAnimations.size).toBe(0);
    act(() => jest.advanceTimersByTime(6000));
    expect(starts).toHaveBeenCalledTimes(3);
    mockFocused = true;
    rerender(<LeagueNotJoinedView />);
    act(() => jest.advanceTimersByTime(1500));
    expect(starts).toHaveBeenCalledTimes(6);
    act(() => jest.advanceTimersByTime(2000));
    expect(starts).toHaveBeenCalledTimes(7);
    unmount();
    expect(runningAnimations.size).toBe(0);
    act(() => jest.advanceTimersByTime(6000));
    expect(starts).toHaveBeenCalledTimes(7);
    expect(listeners.size).toBe(0);
  });

  it('stops in the background and coalesces repeated active notifications', () => {
    const { unmount } = render(<LeagueNotJoinedView />);
    act(() => jest.advanceTimersByTime(1500));
    act(() => emitAppState('background'));
    expect(runningAnimations.size).toBe(0);
    act(() => jest.advanceTimersByTime(6000));
    expect(starts).toHaveBeenCalledTimes(3);
    act(() => emitAppState('active'));
    act(() => emitAppState('active'));
    act(() => jest.advanceTimersByTime(3500));
    expect(starts).toHaveBeenCalledTimes(7);
    unmount();
    expect(runningAnimations.size).toBe(0);
  });

  it('cancels entrance motion and the pending carousel when unmounted immediately', () => {
    const { unmount } = render(<LeagueNotJoinedView />);
    expect(starts).toHaveBeenCalledTimes(2);
    unmount();
    expect(runningAnimations.size).toBe(0);
    act(() => jest.advanceTimersByTime(6000));
    expect(starts).toHaveBeenCalledTimes(2);
  });

  it('does not replay a completed entrance when the screen regains focus', () => {
    const entrance = jest.spyOn(Animated, 'parallel').mockReturnValue({
      start: callback => callback?.({ finished: true }),
      stop: () => {}, reset: () => {},
    });
    const { rerender } = render(<LeagueNotJoinedView />);
    expect(entrance).toHaveBeenCalledTimes(1);
    mockFocused = false;
    rerender(<LeagueNotJoinedView />);
    mockFocused = true;
    rerender(<LeagueNotJoinedView />);
    expect(entrance).toHaveBeenCalledTimes(1);
  });
});
