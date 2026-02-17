import {
  TokenStatus,
  isAgreedOnTermsFromToken,
  tokenUtils,
} from '~/features/auth/utils/jwtUtils';

const buildToken = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
};

describe('jwtUtils', () => {
  it('AUTH-JWT-001 parses terms agreement from token payload', () => {
    const token = buildToken({
      userId: 1,
      nickname: 'runner',
      authority: 'USER',
      isAgreedOnTerms: true,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      iat: Math.floor(Date.now() / 1000),
    });

    expect(isAgreedOnTermsFromToken(token)).toBe(true);
    expect(tokenUtils.parseToken(token)?.nickname).toBe('runner');
  });

  it('AUTH-JWT-002 returns false for malformed token', () => {
    expect(isAgreedOnTermsFromToken('invalid-token')).toBe(false);
    expect(tokenUtils.verifyToken('invalid-token')).toBe(TokenStatus.EXPIRED);
  });

  it('AUTH-JWT-003 classifies valid and soon-expiring token status', () => {
    const validToken = buildToken({
      userId: 1,
      nickname: 'valid',
      authority: 'USER',
      isAgreedOnTerms: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });
    const soonExpiringToken = buildToken({
      userId: 2,
      nickname: 'soon',
      authority: 'USER',
      isAgreedOnTerms: true,
      exp: Math.floor(Date.now() / 1000) + 120,
      iat: Math.floor(Date.now() / 1000),
    });

    expect(tokenUtils.verifyToken(validToken)).toBe(TokenStatus.VALID);
    expect(tokenUtils.verifyToken(soonExpiringToken)).toBe(TokenStatus.SOON_EXPIRING);
    expect(tokenUtils.isTokenExpiringSoon(soonExpiringToken, 300)).toBe(true);
    expect(tokenUtils.isTokenExpiringSoon(validToken, 300)).toBe(false);
  });

  it('returns expired status and zero remaining time for expired token', () => {
    const expiredToken = buildToken({
      userId: 3,
      nickname: 'expired',
      authority: 'USER',
      isAgreedOnTerms: true,
      exp: Math.floor(Date.now() / 1000) - 10,
      iat: Math.floor(Date.now() / 1000) - 120,
    });

    expect(tokenUtils.verifyToken(expiredToken)).toBe(TokenStatus.EXPIRED);
    expect(tokenUtils.getTokenRemainingTime(expiredToken)).toBe(0);
  });
});
