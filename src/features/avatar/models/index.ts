/**
 * Avatar Models 통합 Export
 */
export * from './Avatar';
export * from './Item';
export type { ItemCategory, HairColor } from './avatarConstants';
export {
  HAIR_COLORS,
  DEFAULT_HAIR_COLOR,
  getHairColorById,
  getHairColorByHex,
} from './avatarConstants';