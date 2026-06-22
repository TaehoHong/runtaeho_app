import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { act, render } from '@testing-library/react-native';
import type { CharacterTransform, ShareRunningData } from '~/features/share/models/types';
import { SharePreviewCanvas } from '../SharePreviewCanvas';
import { DEFAULT_GESTURE_HIT_SLOP } from '~/features/share/constants/shareOptions';

type GestureHandler = (...args: any[]) => void;

class MockGestureBuilder {
  handlers: {
    onTouchesDown?: GestureHandler;
    onStart?: GestureHandler;
    onUpdate?: GestureHandler;
    onEnd?: GestureHandler;
    onFinalize?: GestureHandler;
  } = {};

  manualActivation() {
    return this;
  }

  onTouchesDown(handler: GestureHandler) {
    this.handlers.onTouchesDown = handler;
    return this;
  }

  onStart(handler: GestureHandler) {
    this.handlers.onStart = handler;
    return this;
  }

  onUpdate(handler: GestureHandler) {
    this.handlers.onUpdate = handler;
    return this;
  }

  onEnd(handler: GestureHandler) {
    this.handlers.onEnd = handler;
    return this;
  }

  onFinalize(handler: GestureHandler) {
    this.handlers.onFinalize = handler;
    return this;
  }
}

const mockPanGestures: MockGestureBuilder[] = [];
const mockPinchGestures: MockGestureBuilder[] = [];
const mockRotationGestures: MockGestureBuilder[] = [];

jest.mock('react-native-worklets', () => ({
  createSerializable: <T,>(value: T) => value,
  scheduleOnRN: (callback: (...args: unknown[]) => void, ...args: unknown[]) => callback(...args),
}));

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
      call: () => {},
    },
    useAnimatedStyle: (updater: () => object) => updater(),
    useSharedValue: <T,>(value: T) => React.useRef({ value }).current,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    GestureDetector: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children),
    Gesture: {
      Pan: jest.fn(() => {
        const gesture = new MockGestureBuilder();
        mockPanGestures.push(gesture);
        return gesture;
      }),
      Pinch: jest.fn(() => {
        const gesture = new MockGestureBuilder();
        mockPinchGestures.push(gesture);
        return gesture;
      }),
      Rotation: jest.fn(() => {
        const gesture = new MockGestureBuilder();
        mockRotationGestures.push(gesture);
        return gesture;
      }),
      Simultaneous: (...gestures: unknown[]) => ({ gestures }),
    },
  };
});

jest.mock('../DraggableStat', () => ({
  DraggableStat: () => null,
}));

jest.mock('../DraggableRouteMap', () => ({
  DraggableRouteMap: () => null,
}));

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 32;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 1.25;

const runningData: ShareRunningData = {
  distance: 5000,
  durationSec: 1500,
  pace: '5:00',
  startTimestamp: '2026-02-24T00:00:00.000Z',
  earnedPoints: 50,
  locations: [],
};

const getLatestPanHandlers = () => {
  const latest = mockPanGestures.at(-1);

  if (!latest) {
    throw new Error('Pan gesture was not created');
  }

  return latest.handlers;
};

const getLatestRotationHandlers = () => {
  const latest = mockRotationGestures.at(-1);

  if (!latest) {
    throw new Error('Rotation gesture was not created');
  }

  return latest.handlers;
};

const renderCanvas = (
  characterTransform: CharacterTransform,
  onCharacterPositionChange: jest.Mock,
  {
    interactive = true,
    avatarVisible = true,
    onCharacterRotationChange = jest.fn(),
  }: {
    interactive?: boolean;
    avatarVisible?: boolean;
    onCharacterRotationChange?: jest.Mock;
  } = {}
) =>
  render(
    <SharePreviewCanvas
      statElements={[]}
      onStatTransformChange={jest.fn()}
      runningData={runningData}
      onCharacterPositionChange={onCharacterPositionChange}
      onCharacterScaleChange={jest.fn()}
      onCharacterRotationChange={onCharacterRotationChange}
      characterTransform={characterTransform}
      avatarVisible={avatarVisible}
      interactive={interactive}
    />
  );

const beginDrag = () => {
  const handlers = getLatestPanHandlers();

  act(() => {
    handlers.onStart?.();
  });

  return handlers;
};

describe('SharePreviewCanvas gesture sync', () => {
  beforeEach(() => {
    mockPanGestures.length = 0;
    mockPinchGestures.length = 0;
    mockRotationGestures.length = 0;
    jest.clearAllMocks();
  });

  it('does not double-apply cumulative pan translation after a mid-drag rerender', () => {
    const onCharacterPositionChange = jest.fn();
    const initialTransform = { x: 0.5, y: 0.5, scale: 1 };
    const { rerender } = renderCanvas(initialTransform, onCharacterPositionChange);

    let panHandlers = beginDrag();

    act(() => {
      panHandlers.onUpdate?.({
        translationX: PREVIEW_WIDTH * 0.1,
        translationY: 0,
      });
    });

    rerender(
      <SharePreviewCanvas
        statElements={[]}
        onStatTransformChange={jest.fn()}
        runningData={runningData}
        onCharacterPositionChange={onCharacterPositionChange}
        onCharacterScaleChange={jest.fn()}
        characterTransform={{ x: 0.6, y: 0.5, scale: 1 }}
        avatarVisible
      />
    );

    panHandlers = getLatestPanHandlers();

    act(() => {
      panHandlers.onUpdate?.({
        translationX: PREVIEW_WIDTH * 0.2,
        translationY: 0,
      });
      panHandlers.onEnd?.();
      panHandlers.onFinalize?.();
    });

    const lastCall = onCharacterPositionChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toBeCloseTo(0.7);
    expect(lastCall?.[1]).toBeCloseTo(0.5);
  });

  it('applies external characterTransform immediately while idle before the next drag starts', () => {
    const onCharacterPositionChange = jest.fn();
    const { rerender } = renderCanvas({ x: 0.5, y: 0.5, scale: 1 }, onCharacterPositionChange);

    rerender(
      <SharePreviewCanvas
        statElements={[]}
        onStatTransformChange={jest.fn()}
        runningData={runningData}
        onCharacterPositionChange={onCharacterPositionChange}
        onCharacterScaleChange={jest.fn()}
        characterTransform={{ x: 0.65, y: 0.5, scale: 1 }}
        avatarVisible
      />
    );

    const panHandlers = beginDrag();

    act(() => {
      panHandlers.onUpdate?.({
        translationX: PREVIEW_WIDTH * 0.1,
        translationY: 0,
      });
      panHandlers.onEnd?.();
      panHandlers.onFinalize?.();
    });

    const lastCall = onCharacterPositionChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toBeCloseTo(0.75);
    expect(lastCall?.[1]).toBeCloseTo(0.5);
  });

  it('does not apply canvas glow shadow styles', () => {
    const { UNSAFE_getAllByProps } = renderCanvas(
      { x: 0.5, y: 0.5, scale: 1 },
      jest.fn()
    );

    const canvas = UNSAFE_getAllByProps({ collapsable: false })[0];
    const style = StyleSheet.flatten(canvas.props.style);

    expect(style.shadowColor).toBeUndefined();
    expect(style.shadowOffset).toBeUndefined();
    expect(style.shadowOpacity).toBeUndefined();
    expect(style.shadowRadius).toBeUndefined();
    expect(style.elevation).toBeUndefined();
  });

  it('positions the character gesture surface to the character bounds instead of the full canvas', () => {
    const { getByTestId } = renderCanvas(
      { x: 0.5, y: 0.5, scale: 1 },
      jest.fn()
    );

    const gestureSurface = getByTestId('share-character-gesture-surface');
    const style = StyleSheet.flatten(gestureSurface.props.style);

    expect(style.width).toBeCloseTo(
      PREVIEW_WIDTH * 0.25 + DEFAULT_GESTURE_HIT_SLOP.left + DEFAULT_GESTURE_HIT_SLOP.right
    );
    expect(style.height).toBeCloseTo(
      PREVIEW_HEIGHT * 0.2 + DEFAULT_GESTURE_HIT_SLOP.top + DEFAULT_GESTURE_HIT_SLOP.bottom
    );
    expect(style.left).toBeCloseTo(PREVIEW_WIDTH * 0.375 - DEFAULT_GESTURE_HIT_SLOP.left);
    expect(style.top).toBeCloseTo(PREVIEW_HEIGHT * 0.3 - DEFAULT_GESTURE_HIT_SLOP.top);
  });

  it('does not render the character gesture surface when interactivity is disabled', () => {
    const { queryByTestId } = renderCanvas(
      { x: 0.5, y: 0.5, scale: 1 },
      jest.fn(),
      { interactive: false }
    );

    expect(queryByTestId('share-character-gesture-surface')).toBeNull();
  });

  it('commits character rotation from a rotation gesture', () => {
    const onCharacterRotationChange = jest.fn();
    renderCanvas(
      { x: 0.5, y: 0.5, scale: 1, rotation: 10 },
      jest.fn(),
      { onCharacterRotationChange }
    );

    const rotationHandlers = getLatestRotationHandlers();

    act(() => {
      rotationHandlers.onStart?.();
      rotationHandlers.onUpdate?.({ rotation: Math.PI / 4 });
      rotationHandlers.onEnd?.();
      rotationHandlers.onFinalize?.();
    });

    expect(onCharacterRotationChange).toHaveBeenLastCalledWith(55);
  });
});
