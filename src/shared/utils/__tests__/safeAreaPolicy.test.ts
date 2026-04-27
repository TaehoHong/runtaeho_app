import {
  getBottomOffsetForPlatform,
  getMainTabBarHeight,
  getMainTabBarScrollContentPaddingBottom,
  getTopScreenEdgesForPlatform,
} from '~/shared/utils/safeAreaPolicy';

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

  it('calculates main tab bar height from safe-area bottom inset', () => {
    expect(getMainTabBarHeight(34)).toBe(94);
    expect(getMainTabBarHeight(0)).toBe(70);
  });

  it('calculates scroll content padding to keep content above the main tab bar', () => {
    expect(getMainTabBarScrollContentPaddingBottom(34)).toBe(110);
    expect(getMainTabBarScrollContentPaddingBottom(0)).toBe(86);
  });
});
