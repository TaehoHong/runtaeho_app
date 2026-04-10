import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { DraggableRouteMap } from '../DraggableRouteMap';
import { DraggableStat } from '../DraggableStat';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  const AnimatedView = React.forwardRef(
    function MockAnimatedView(
      {
        children,
        ...props
      }: {
        children?: React.ReactNode;
        [key: string]: unknown;
      },
      ref: React.Ref<typeof View>
    ) {
      return React.createElement(View, { ...props, ref }, children);
    }
  );

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
    },
    useAnimatedStyle: (updater: () => object) => updater(),
    useSharedValue: <T,>(value: T) => React.useRef({ value }).current,
    withSpring: <T,>(value: T) => value,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  class MockGestureBuilder {
    onStart() { return this; }
    onUpdate() { return this; }
    onEnd() { return this; }
    onTouchesDown() { return this; }
    onFinalize() { return this; }
    manualActivation() { return this; }
  }

  return {
    GestureDetector: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'gesture-detector' }, children),
    Gesture: {
      Pan: jest.fn(() => new MockGestureBuilder()),
      Pinch: jest.fn(() => new MockGestureBuilder()),
      Simultaneous: (...gestures: unknown[]) => ({ gestures }),
    },
  };
});

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (callback: (...args: unknown[]) => void, ...args: unknown[]) => callback(...args),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');

  const createMock = (testID: string) => {
    const MockComponent = ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(View, { ...props, testID }, children);

    MockComponent.displayName = `Mock${testID}`;
    return MockComponent;
  };

  return {
    __esModule: true,
    default: createMock('svg'),
    Svg: createMock('svg'),
    Path: createMock('svg-path'),
    Circle: createMock('svg-circle'),
    Defs: createMock('svg-defs'),
    Filter: createMock('svg-filter'),
    FeGaussianBlur: createMock('svg-blur'),
  };
});

jest.mock('~/shared/styles', () => ({
  GREY: {
    100: '#f3f4f6',
    200: '#e5e7eb',
    500: '#6b7280',
  },
  PRIMARY: {
    500: '#59ec3a',
  },
}));

describe('share overlay interactivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not mount a gesture detector for stats on the export surface', () => {
    render(
      <DraggableStat
        type="distance"
        value="5.00"
        label="km"
        transform={{ x: 0, y: 0, scale: 1 }}
        onTransformChange={jest.fn()}
        visible
        interactive={false}
      />
    );

    expect(screen.queryByTestId('gesture-detector')).toBeNull();
  });

  it('does not mount a gesture detector for the route map on the export surface', () => {
    render(
      <DraggableRouteMap
        locations={[
          {
            latitude: 37.5665,
            longitude: 126.978,
            altitude: 0,
            accuracy: 5,
            heading: 0,
            speed: 0,
            timestamp: '2026-02-24T00:00:00.000Z',
          },
          {
            latitude: 37.567,
            longitude: 126.979,
            altitude: 0,
            accuracy: 5,
            heading: 0,
            speed: 0,
            timestamp: '2026-02-24T00:01:00.000Z',
          },
        ]}
        transform={{ x: 0, y: 0, scale: 1 }}
        onTransformChange={jest.fn()}
        visible
        interactive={false}
      />
    );

    expect(screen.queryByTestId('gesture-detector')).toBeNull();
  });
});
