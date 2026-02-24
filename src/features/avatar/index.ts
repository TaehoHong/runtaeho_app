/**
 * 아바타 Feature 모듈 Export
 *
 * 사용법:
 * ```ts
 * import {
 *   useAvatarItems,
 *   ItemType,
 *   AVATAR_COLORS,
 *   toAvatarItem,
 * } from '~/features/avatar';
 * ```
 */

// ===================================
// Types & Models
// ===================================
export type {
  Item,
  EquippedItemsMap,
  ItemType,
  PurchaseItemsRequest,
  ItemCategory,
  HairColor,
  ItemStatusValue,
} from './models';
export { isItemType } from './models';

// ===================================
// Constants
// ===================================
export {
  BUTTON_SIZE, ERROR_MESSAGES, GRID_LAYOUT,
  ITEM_CARD_SIZE, ITEM_CATEGORIES, ITEM_OPACITY, PRICE_DISPLAY, QUERY_KEY_PREFIX,
  QUERY_OPTIONS, SUCCESS_MESSAGES, UNITY_PREVIEW, getCategoryByType,
  getCategoryDisplayName,
  getCategoryUnityName,
  // Hair Color
  HAIR_COLORS,
  DEFAULT_HAIR_COLOR,
  getHairColorById,
  getHairColorByHex,
} from './models/avatarConstants';

export { ItemStatus } from './models/Item';

// ===================================
// Services
// ===================================
export { avatarService } from './services/avatarService';

// ===================================
// React Query Hooks
// ===================================
export {
  avatarQueryKeys, invalidateAllAvatarCache, invalidateItemsByType, prefetchItems, useAvatarItems,
  useMainAvatar, usePurchaseAndEquipItems, usePurchaseItems,
  useUpdateEquippedItems
} from './services/avatarQueries';
