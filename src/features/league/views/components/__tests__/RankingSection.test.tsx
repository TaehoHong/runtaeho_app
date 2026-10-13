import React from 'react';
import { Animated, View } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import type { LeagueParticipant } from '../../../models';
import { RankingSection } from '../RankingSection';

jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const React = require('react');
  const View = require('react-native/Libraries/Components/View/View').default;
  return { __esModule: true, default: React.forwardRef(function AllRows({ data, renderItem }: { data: LeagueParticipant[]; renderItem: (value: { item: LeagueParticipant; index: number }) => React.ReactNode }, ref: React.Ref<unknown>) {
    React.useImperativeHandle(ref, () => ({ scrollToIndex: () => {}, scrollToOffset: () => {} }));
    return React.createElement(View, null, data.map((item, index) => React.createElement(React.Fragment, { key: item.id }, renderItem({ item, index }))));
  }) };
});

jest.mock('../RankItem', () => ({ RankItem: ({ participant }: { participant: LeagueParticipant }) => {
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
