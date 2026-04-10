import React from 'react';
import { render } from '@testing-library/react-native';

const mockStackScreen = jest.fn();

jest.mock('expo-router/stack', () => {
  const React = require('react');

  const Stack = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const Screen = (props: unknown) => {
    mockStackScreen(props);
    return null;
  };

  (Stack as typeof Stack & { Screen?: typeof Screen }).Screen = Screen;

  return { Stack };
});

jest.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('~/services/queryClient', () => ({
  queryClient: {},
}));

jest.mock('~/providers/AuthProvider', () => ({
  AuthProvider: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('~/providers/AppStateProvider', () => ({
  AppStateProvider: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('~/features/updates', () => ({
  UpdateProvider: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('~/features/forceUpdate', () => ({
  ForceUpdateProvider: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('~/features/unity/components/GlobalUnityHost', () => ({
  GlobalUnityHost: () => null,
}));

jest.mock('~/shared/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('~/features/share/stores/shareEntryTransitionStore', () => ({
  useShareEntryTransitionStore: (
    selector: (state: { isEntryTransitionActive: boolean }) => unknown
  ) => selector({ isEntryTransitionActive: false }),
}));

jest.mock('~/config/sentry', () => ({
  initializeSentry: jest.fn(),
  Sentry: {
    wrap: <T,>(component: T) => component,
  },
}));

describe('RootLayout transparent route policy', () => {
  const originalDev = __DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    Object.defineProperty(global, '__DEV__', {
      configurable: true,
      value: originalDev,
    });
  });

  it('keeps the user stack route transparent so the single GlobalUnityHost can render through child screens', () => {
    Object.defineProperty(global, '__DEV__', {
      configurable: true,
      value: false,
    });

    let RootLayout: React.ComponentType;
    jest.isolateModules(() => {
      RootLayout = require('../../app/_layout').default as React.ComponentType;
    });

    render(<RootLayout />);

    const screenProps = mockStackScreen.mock.calls.map(([props]) => props) as {
      name: string;
      options?: { contentStyle?: { backgroundColor?: string } };
    }[];
    const userScreen = screenProps.find((props) => props.name === 'user');

    expect(userScreen?.options?.contentStyle).toMatchObject({
      backgroundColor: 'transparent',
    });
  });
});
