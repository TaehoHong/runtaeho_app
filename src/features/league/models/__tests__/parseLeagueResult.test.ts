import { LeagueResultStatus, LeagueTierType } from '../League';
import { parseLeagueResult } from '../parseLeagueResult';

const result = {
  previousTier: LeagueTierType.CHALLENGER,
  currentTier: LeagueTierType.GOLD,
  resultStatus: LeagueResultStatus.REBIRTH,
  finalRank: 0,
  totalParticipants: 0,
  totalDistance: 0,
  rewardPoints: 200,
  participants: [{ id: 1, rank: 0, distance: 0, nickname: null, profileImageUrl: null, isMe: true, isBot: false }],
};

describe('parseLeagueResult', () => {
  it.each(Object.values(LeagueTierType))('accepts server tier %s and nullable reward/profile fields', (tier) => {
    const input = { ...result, previousTier: tier, currentTier: tier, rewardPoints: null };
    expect(parseLeagueResult(JSON.stringify(input))).toEqual(input);
  });

  it.each(Object.values(LeagueResultStatus))('accepts server status %s without imposing a tier combination', (status) => {
    const input = { ...result, resultStatus: status, participants: [], extraServerField: true };
    expect(parseLeagueResult(JSON.stringify(input))).toEqual(input);
  });

  it.each([undefined, null, '', '{', 'null', '[]', '1', 'true', JSON.stringify({}), [JSON.stringify(result)]])('rejects malformed or ambiguous route parameters: %p', (parameter) => {
    expect(parseLeagueResult(parameter)).toBeNull();
  });

  it.each([
    { ...result, previousTier: 'UNKNOWN' },
    { ...result, currentTier: null },
    { ...result, resultStatus: 'UNKNOWN' },
    { ...result, finalRank: '0' },
    { ...result, rewardPoints: undefined },
    { ...result, participants: [null] },
    { ...result, participants: [{ ...result.participants[0], isMe: 'true' }] },
    { ...result, participants: [{ ...result.participants[0], nickname: 1 }] },
  ])('rejects an invalid DTO field: %p', (input) => {
    expect(parseLeagueResult(JSON.stringify(input))).toBeNull();
  });

  it('rejects a nonfinite number parsed from valid JSON', () => {
    expect(parseLeagueResult(JSON.stringify(result).replace('"totalDistance":0', '"totalDistance":1e400'))).toBeNull();
  });
});
