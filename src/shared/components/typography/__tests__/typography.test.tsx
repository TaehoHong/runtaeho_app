import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Platform, StyleSheet, type TextStyle } from 'react-native';
import { NativeText, Text, TextBold } from '../Text';
import { NativeTextInput, TextInput, TextInputBold } from '../TextInput';

const originalPlatformOS = Platform.OS;

afterEach(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
});

describe('NativeTextInput native content sizing', () => {
  it('grows and shrinks on Android without changing the draft or selection', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const onChangeText = jest.fn();
    const onContentSizeChange = jest.fn();
    const { getByTestId } = render(
      <NativeTextInput testID="input" value="unsaved draft" selection={{ start: 3, end: 3 }}
        style={{ minHeight: 48 }} onChangeText={onChangeText} onContentSizeChange={onContentSizeChange} />
    );
    const input = getByTestId('input');
    const expanded = { nativeEvent: { contentSize: { width: 200, height: 82 } } };
    fireEvent(input, 'contentSizeChange', expanded);
    expect(StyleSheet.flatten(input.props.style).height).toBe(82);
    expect(input.props.value).toBe('unsaved draft');
    expect(input.props.selection).toEqual({ start: 3, end: 3 });
    expect(onChangeText).not.toHaveBeenCalled();
    expect(onContentSizeChange).toHaveBeenCalledWith(expanded);

    fireEvent(input, 'contentSizeChange', { nativeEvent: { contentSize: { width: 200, height: 40 } } });
    expect(StyleSheet.flatten(input.props.style).height).toBe(48);
  });

  it('forwards iOS content changes while preserving its existing height constraint', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const onContentSizeChange = jest.fn();
    const { getByTestId } = render(
      <NativeTextInput testID="input" style={{ minHeight: 48 }} onContentSizeChange={onContentSizeChange} />
    );
    const event = { nativeEvent: { contentSize: { width: 200, height: 82 } } };
    fireEvent(getByTestId('input'), 'contentSizeChange', event);
    expect(StyleSheet.flatten(getByTestId('input').props.style).minHeight).toBe(48);
    expect(StyleSheet.flatten(getByTestId('input').props.style).height).toBeUndefined();
    expect(onContentSizeChange).toHaveBeenCalledWith(event);
  });

  it('keeps an explicit Android field height as the minimum while resizing native content', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const { getByTestId } = render(<NativeTextInput testID="input" style={{ height: 48 }} />);
    const input = getByTestId('input');
    for (const [content, expected] of [[32, 48], [82, 82], [32, 48]]) {
      fireEvent(input, 'contentSizeChange', { nativeEvent: { contentSize: { width: 200, height: content } } });
      expect(StyleSheet.flatten(input.props.style).height).toBe(expected);
    }
  });
});

describe('NativeText', () => {
  it('uses the registered bold face on Android', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const { getByTestId } = render(
      <NativeText testID="type" style={{ fontFamily: 'Pretendard-Bold', fontWeight: '700' }} />
    );

    expect(StyleSheet.flatten(getByTestId('type').props.style)).toEqual({
      fontFamily: 'Pretendard-Bold', fontWeight: 'normal',
    });
  });

  it('preserves the current explicit iOS font', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const { getByTestId } = render(
      <NativeText testID="type" style={{ fontFamily: 'Pretendard-Bold', fontWeight: '700' }} />
    );

    expect(StyleSheet.flatten(getByTestId('type').props.style)).toEqual({
      fontFamily: 'Pretendard-Bold', fontWeight: '700',
    });
  });

  it.each(['android', 'ios'])('keeps the default system font on %s', (platform) => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
    const { getByTestId } = render(<NativeText testID="type" style={{ fontWeight: '700' }} />);

    expect(StyleSheet.flatten(getByTestId('type').props.style)).toEqual({ fontWeight: '700' });
  });
});

describe.each([
  ['Text', Text],
  ['TextInput', TextInput],
] as const)('%s platform fonts', (_name, Component) => {
  it.each<[string, TextStyle, TextStyle]>([
    ['generic family', { fontFamily: 'Pretendard', fontWeight: '600' },
      { fontFamily: 'Pretendard-SemiBold', fontWeight: 'normal' }],
    ['weight without a family', { fontWeight: '700' },
      { fontFamily: 'Pretendard-Bold', fontWeight: 'normal' }],
    ['explicit face', { fontFamily: 'Pretendard-Medium', fontWeight: '700' },
      { fontFamily: 'Pretendard-Medium', fontWeight: 'normal' }],
    ['Cafe24 internal name', { fontFamily: 'Cafe24PROUP', fontWeight: '400' },
      { fontFamily: 'Cafe24Proup', fontWeight: 'normal' }],
    ['system family', { fontFamily: 'monospace', fontWeight: 'bold' },
      { fontFamily: 'monospace', fontWeight: 'bold' }],
  ])('uses the intended Android font for %s', (_case, input, expected) => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const { getByTestId } = render(
      <Component testID="type" style={[{ fontSize: 16, color: '#123456' }, input]} />
    );

    expect(StyleSheet.flatten(getByTestId('type').props.style)).toEqual({
      fontSize: 16,
      color: '#123456',
      ...expected,
    });
  });

  it.each<[string, TextStyle, TextStyle]>([
    ['generic family', { fontFamily: 'Pretendard', fontWeight: '600' },
      { fontFamily: 'Pretendard', fontWeight: '600' }],
    ['weight without a family', { fontWeight: '700' },
      { fontFamily: 'Pretendard-Bold', fontWeight: '700' }],
    ['explicit face', { fontFamily: 'Pretendard-Medium', fontWeight: '700' },
      { fontFamily: 'Pretendard-Medium', fontWeight: '700' }],
    ['Cafe24 internal name', { fontFamily: 'Cafe24PROUP', fontWeight: '400' },
      { fontFamily: 'Cafe24PROUP', fontWeight: '400' }],
  ])('preserves the current iOS style for %s', (_case, input, expected) => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const { getByTestId } = render(<Component testID="type" style={input} />);

    expect(StyleSheet.flatten(getByTestId('type').props.style)).toEqual(expected);
  });
});

describe.each([
  ['TextBold', TextBold],
  ['TextInputBold', TextInputBold],
] as const)('%s variant', (_name, Component) => {
  it('keeps the bundled bold face on Android when fontWeight is supplied', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const { getByTestId } = render(<Component testID="type" style={{ fontWeight: '700' }} />);

    expect(StyleSheet.flatten(getByTestId('type').props.style)).toEqual({
      fontFamily: 'Pretendard-Bold',
      fontWeight: 'normal',
    });
  });

  it('preserves the current iOS variant style', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const { getByTestId } = render(<Component testID="type" style={{ fontWeight: '700' }} />);

    expect(StyleSheet.flatten(getByTestId('type').props.style)).toEqual({
      fontFamily: 'Pretendard-Bold',
      fontWeight: '700',
    });
  });
});
