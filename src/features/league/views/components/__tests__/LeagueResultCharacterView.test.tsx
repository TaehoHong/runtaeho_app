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
      isUnityAvailable: true,
      isUnityStarted: true,
      handleUnityReady: jest.fn(),
    });

    renderWithProviders(
      <LeagueResultCharacterView resultStatus={LeagueResultStatus.PROMOTED} />
    );

    expect(screen.getByTestId('league-result-viewport')).toBeTruthy();
  });

  it('renders fallback content when Unity is unavailable', () => {
    mockUseLeagueResultAnimation.mockReturnValue({
      isUnityReady: false,
      isUnityAvailable: false,
      isUnityStarted: false,
      handleUnityReady: jest.fn(),
    });

    renderWithProviders(
      <LeagueResultCharacterView resultStatus={LeagueResultStatus.MAINTAINED} />
    );

    expect(screen.getByText('수고했어요!')).toBeTruthy();
    expect(screen.queryByTestId('league-result-viewport')).toBeNull();
  });
});
