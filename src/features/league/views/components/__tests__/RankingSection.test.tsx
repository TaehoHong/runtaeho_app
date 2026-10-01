import React from 'react';
import { FlatList } from 'react-native';
import { screen } from '@testing-library/react-native';
import type { LeagueParticipant } from '~/features/league/models';
import { RankingSection } from '~/features/league/views/components/RankingSection';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

function createParticipant(overrides: Partial<LeagueParticipant>): LeagueParticipant {
  return {
    id: 1,
    rank: 1,
    nickname: 'runner-1',
    profileImageUrl: null,
    distance: 1000,
    isMe: false,
    isBot: false,
    ...overrides,
  };
}

describe('RankingSection', () => {
  it('provides participant data to FlatList on the first render without initialScrollIndex', () => {
    const participants = [
      createParticipant({ id: 1, rank: 1, nickname: 'runner-1' }),
      createParticipant({ id: 2, rank: 2, nickname: 'runner-me', isMe: true, distance: 900 }),
      createParticipant({ id: 3, rank: 3, nickname: 'runner-3', distance: 800 }),
    ];

    renderWithProviders(
      <RankingSection participants={participants} previousRank={undefined} />
    );

    const list = screen.UNSAFE_getByType(FlatList);

    expect(list.props.data).toEqual(participants);
    expect(list.props.initialScrollIndex).toBeUndefined();
    expect(screen.getByText(/실제 러닝 종료 시각으로 집계/)).toBeTruthy();
    expect(screen.getByText(/종료한 시즌에 전체 거리가 반영/)).toBeTruthy();
  });

  it('updates FlatList data when participants change outside the ranking animation flow', () => {
    const initialParticipants = [
      createParticipant({ id: 1, rank: 1, nickname: 'runner-1' }),
      createParticipant({ id: 2, rank: 2, nickname: 'runner-me', isMe: true, distance: 900 }),
    ];
    const refreshedParticipants = [
      createParticipant({ id: 1, rank: 1, nickname: 'runner-me', isMe: true, distance: 1200 }),
      createParticipant({ id: 4, rank: 2, nickname: 'runner-4', distance: 1100 }),
    ];

    const { rerender } = renderWithProviders(
      <RankingSection participants={initialParticipants} previousRank={undefined} />
    );

    rerender(
      <RankingSection participants={refreshedParticipants} previousRank={undefined} />
    );

    const list = screen.UNSAFE_getByType(FlatList);
    expect(list.props.data).toEqual(refreshedParticipants);
  });
});
