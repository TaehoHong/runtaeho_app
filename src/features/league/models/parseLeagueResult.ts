import { LeagueResultStatus, LeagueTierType } from './League';
import type { LeagueParticipant, LeagueResult } from './League';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const isParticipant = (value: unknown): value is LeagueParticipant =>
  isObject(value)
  && isNumber(value.id)
  && isNumber(value.rank)
  && isNumber(value.distance)
  && isNullableString(value.nickname)
  && isNullableString(value.profileImageUrl)
  && typeof value.isMe === 'boolean'
  && typeof value.isBot === 'boolean';

/** Validates the decoded route parameter against the current server DTO. */
export const parseLeagueResult = (parameter: unknown): LeagueResult | null => {
  if (typeof parameter !== 'string') return null;
  let value: unknown;
  try {
    value = JSON.parse(parameter);
  } catch {
    return null;
  }
  if (!isObject(value)
    || !Object.values(LeagueTierType).includes(value.previousTier as LeagueTierType)
    || !Object.values(LeagueTierType).includes(value.currentTier as LeagueTierType)
    || !Object.values(LeagueResultStatus).includes(value.resultStatus as LeagueResultStatus)
    || !isNumber(value.finalRank)
    || !isNumber(value.totalParticipants)
    || !isNumber(value.totalDistance)
    || !(value.rewardPoints === null || isNumber(value.rewardPoints))
    || !Array.isArray(value.participants)
    || !value.participants.every(isParticipant)) return null;

  return value as unknown as LeagueResult;
};
