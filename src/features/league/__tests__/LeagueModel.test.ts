import {
  calculateProgressPosition,
  formatDistance,
  getResultMessage,
  getTierType,
  getPromotionStatus,
  LeagueResultStatus,
  LeagueTierType,
} from '~/features/league/models/League';

describe('League model helpers', () => {
  it('LEAGUE-MODEL-001 computes promotion status by rank boundaries', () => {
    expect(getPromotionStatus(1, 3, 8)).toBe('PROMOTION');
    expect(getPromotionStatus(5, 3, 8)).toBe('MAINTAIN');
    expect(getPromotionStatus(9, 3, 8)).toBe('RELEGATION');
  });

  it('LEAGUE-MODEL-002 computes progress position in normalized range', () => {
    expect(calculateProgressPosition(1, 10)).toBe(0);
    expect(calculateProgressPosition(10, 10)).toBe(1);
    expect(calculateProgressPosition(3, 5)).toBe(0.5);
  });

  it('formats distance and handles single-participant progress boundary', () => {
    expect(formatDistance(1534)).toBe('1.5 km');
    expect(calculateProgressPosition(1, 1)).toBe(0);
    expect(calculateProgressPosition(2, 1)).not.toBeGreaterThan(0);
  });

  it('maps tier names with fallback for unknown tiers', () => {
    expect(getTierType('gold')).toBe(LeagueTierType.GOLD);
    expect(getTierType('not-a-tier')).toBe(LeagueTierType.BRONZE);
    expect(getTierType('not-a-tier')).not.toBe(LeagueTierType.DIAMOND);
  });

  it('LEAGUE-MODEL-003 returns proper result messages for all league result statuses', () => {
    expect(getResultMessage(LeagueResultStatus.PROMOTED, 'GOLD').title).toBe('축하합니다!');
    expect(getResultMessage(LeagueResultStatus.MAINTAINED, 'SILVER').title).toBe(
      '수고하셨습니다!'
    );
    expect(getResultMessage(LeagueResultStatus.RELEGATED, 'BRONZE').title).toBe('아쉽습니다');
    expect(getResultMessage(LeagueResultStatus.REBIRTH, 'CHALLENGER').subtitle).toContain(
      '다시 처음부터'
    );
  });
});
