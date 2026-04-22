import React from 'react';
import { screen } from '@testing-library/react-native';
import { LeagueResultCharacterView } from '~/features/league/views/components/LeagueResultCharacterView';
import { LeagueResultStatus } from '~/features/league/models';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockUseLeagueResultAnimation = jest.fn();
const mockUseFocusEffect = jest.fn();
const mockSetActiveViewport = jest.fn();
const mockClearActiveViewport = jest.fn();

jest.mock('~/features/league/hooks/useLeagueResultAnimation', () => ({
  useLeagueResultAnimation: (...args: unknown[]) => mockUseLeagueResultAnimation(...args),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (...args: unknown[]) => mockUseFocusEffect(...args),
}));

jest.mock('~/stores/unity/unityStore', () => ({
  useUnityStore: (
    selector: (state: {
      setActiveViewport: typeof mockSetActiveViewport;
      clearActiveViewport: typeof mockClearActiveViewport;
    }) => unknown
  ) =>
    selector({
      setActiveViewport: mockSetActiveViewport,
      clearActiveViewport: mockClearActiveViewport,
    }),
}));

jest.mock('~/features/unity/components/UnityLoadingState', () => ({
  UnityLoadingState: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, null, children);
  },
}));

describe('LeagueResultCharacterView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFocusEffect.mockImplementation((callback: () => void | (() => void)) => {
      callback();
    });
  });

  it('renders a global host viewport when Unity is available', () => {
    mockUseLeagueResultAnimation.mockReturnValue({
      isUnityReady: true,
      isUnityStarted: true,
      handleUnityReady: jest.fn(),
    });

    renderWithProviders(
      <LeagueResultCharacterView resultStatus={LeagueResultStatus.PROMOTED} />
    );

    expect(screen.getByTestId('league-result-viewport')).toBeTruthy();
  });

  it('keeps rendering the global host viewport while Unity is still loading', () => {
    mockUseLeagueResultAnimation.mockReturnValue({
      isUnityReady: false,
      isUnityStarted: false,
      handleUnityReady: jest.fn(),
    });

    renderWithProviders(
      <LeagueResultCharacterView resultStatus={LeagueResultStatus.MAINTAINED} />
    );

    expect(screen.getByTestId('league-result-viewport')).toBeTruthy();
    expect(screen.queryByText('수고했어요!')).toBeNull();
  });
});
