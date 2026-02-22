import { getBottomOffsetForPlatform, getTopScreenEdgesForPlatform } from '~/shared/utils/safeAreaPolicy';

describe('safeAreaPolicy', () => {
  it('returns top and bottom edges for android top screens', () => {
    expect(getTopScreenEdgesForPlatform('android')).toEqual(['top', 'bottom']);
  });

  it('returns top edge only for ios top screens', () => {
    expect(getTopScreenEdgesForPlatform('ios')).toEqual(['top']);
  });

  it('adds bottom inset for android bottom offsets', () => {
    expect(getBottomOffsetForPlatform(32, 24, 'android')).toBe(56);
  });

  it('keeps base offset unchanged for ios bottom offsets', () => {
    expect(getBottomOffsetForPlatform(32, 24, 'ios')).toBe(32);
  });
});
