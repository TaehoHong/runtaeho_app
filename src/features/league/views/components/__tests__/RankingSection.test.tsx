import React from 'react';
import { Animated, Dimensions, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { LeagueParticipant } from '../../../models';
import { RankingSection } from '../RankingSection';
import { RankItem } from '../RankItem';

const mockListProps = jest.fn();

jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const React = require('react');
  const View = require('react-native/Libraries/Components/View/View').default;
  return { __esModule: true, default: React.forwardRef(function AllRows(props: { data: LeagueParticipant[]; renderItem: (value: { item: LeagueParticipant; index: number }) => React.ReactNode; ListHeaderComponent?: React.ReactNode }, ref: React.Ref<unknown>) {
    const { data, renderItem, ListHeaderComponent } = props;
    mockListProps(props);
    React.useImperativeHandle(ref, () => ({ scrollToIndex: () => {}, scrollToOffset: () => {} }));
    return React.createElement(View, null, ListHeaderComponent, data.map((item, index) => React.createElement(React.Fragment, { key: item.id }, renderItem({ item, index }))));
  }) };
});

it('uses measured page-header and expanded row geometry for scrolling and rank movement', () => {
  const window = Dimensions.get('window');
  const display = Dimensions.get('screen');
  const sequence = jest.spyOn(Animated, 'sequence').mockImplementation(() => ({ start: () => {}, stop: () => {}, reset: () => {} }));
  const timing = jest.spyOn(Animated, 'timing');
  let rendered: ReturnType<typeof render> | undefined;
  try {
    act(() => Dimensions.set({ window: { ...window, fontScale: 3.14 }, screen: { ...display, fontScale: 3.14 } }));
    rendered = render(<RankingSection participants={participants(4)} previousRank={3} pageHeader={<View testID="summary" />} />);
    const rows = screen.UNSAFE_getAllByType(RankItem);
    const rowHeight = rows[0]!.props.rowHeight;
    expect(rowHeight).toBeGreaterThan(56);
    rows.forEach(row => expect(row.props.rowHeight).toBe(rowHeight));
    let header = screen.getByTestId('summary').parent;
    while (header && !header.props.onLayout) header = header.parent;
    expect(header).not.toBeNull();
    fireEvent(header!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 393, height: 400 } } });
    const list = mockListProps.mock.calls[mockListProps.mock.calls.length - 1]![0];
    expect(list.getItemLayout(null, 2)).toEqual({ index: 2, length: rowHeight, offset: 400 + 2 * rowHeight });
    const targets = timing.mock.calls.map(call => call[1].toValue);
    expect(targets).toContain(-2 * rowHeight);
    expect(targets).toContain(rowHeight);
  } finally {
    rendered?.unmount();
    act(() => Dimensions.set({ window, screen: display }));
    sequence.mockRestore();
    timing.mockRestore();
  }
});

jest.mock('../RankItem', () => ({ ...jest.requireActual('../RankItem'), RankItem: ({ participant }: { participant: LeagueParticipant }) => {
  const React = require('react');
  const { Text } = require('react-native');
  return React.createElement(Text, null, participant.nickname);
} }));
const participants = (count: number, name = 'runner'): LeagueParticipant[] => Array.from({ length: count }, (_, index) => ({
  id: index + 1, rank: index + 1, nickname: `${name}-${index}`, profileImageUrl: null,
  distance: 1000, isMe: index === 0, isBot: false,
}));

it('allocates displacement values for every row and ignores stopped animation completion', () => {
  const callbacks: ((result: { finished: boolean }) => void)[] = [];
  const sequence = jest.spyOn(Animated, 'sequence').mockImplementation(() => ({
    start: callback => { if (callback) callbacks.push(callback); },
    stop: () => {}, reset: () => {},
  }));
  const { rerender } = render(<RankingSection participants={participants(12)} previousRank={12} />);
  const translatedViews = screen.UNSAFE_getAllByType(View).filter(node => {
    const styles = Array.isArray(node.props.style) ? node.props.style : [node.props.style];
    return styles.some((style: { transform?: unknown[] } | undefined) => style?.transform);
  });
  expect(translatedViews.length).toBeGreaterThan(10);
  translatedViews.forEach(node => {
    const styles = Array.isArray(node.props.style) ? node.props.style : [node.props.style];
    const transform = styles.find((style: { transform?: unknown[] } | undefined) => style?.transform).transform;
    expect(transform[0].translateY).toBeDefined();
  });
  const previousCompletion = callbacks[callbacks.length - 1]!;
  rerender(<RankingSection participants={participants(5, 'updated')} previousRank={5} />);
  act(() => previousCompletion({ finished: false }));
  expect(screen.queryByText('runner-11')).toBeNull();
  expect(screen.getByText('updated-1')).toBeTruthy();
  sequence.mockRestore();
});

it('reveals ranking rules on request and updates measured header geometry', () => {
  render(<RankingSection participants={participants(4)} pageHeader={<View testID="summary" />} />);
  const rule = '업로드 시각이 아닌 실제 러닝 종료 시각으로 집계해요. 시즌을 넘겨 달리면 종료한 시즌에 전체 거리가 반영돼요.';
  expect(screen.queryByText(rule)).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: '순위 집계 안내' }));
  expect(screen.getByText(rule)).toBeOnTheScreen();
  let header = screen.getByTestId('summary').parent;
  while (header && !header.props.onLayout) header = header.parent;
  fireEvent(header!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 393, height: 480 } } });
  const list = mockListProps.mock.calls[mockListProps.mock.calls.length - 1]![0];
  expect(list.getItemLayout(null, 0).offset).toBe(480);
  fireEvent.press(screen.getByRole('button', { name: '순위 집계 안내' }));
  expect(screen.queryByText(rule)).toBeNull();
});
