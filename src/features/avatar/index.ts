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
  Avatar, AvatarDto, AvatarItem, EquippedItemsMap, GetItemsRequest, ItemCategory, ItemDto, ItemStatus, ItemType, ItemTypeDto, ItemsByCategory, PurchaseItem, PurchaseItemsRequest,
  UpdateEquippedItemsRequest
} from './models/avatarTypes';

export {
  isItemType,
  isValidAvatarItem
} from './models/avatarTypes';

// ===================================
// Constants
// ===================================
export {
  AVATAR_API_ENDPOINTS, AVATAR_COLORS,
  BUTTON_SIZE, ERROR_MESSAGES, GRID_LAYOUT,
  ITEM_CARD_SIZE, ITEM_CATEGORIES, ITEM_OPACITY, PAGINATION_CONFIG, PRICE_DISPLAY, QUERY_KEY_PREFIX,
  QUERY_OPTIONS, SUCCESS_MESSAGES, UNITY_PREVIEW, getCategoryByType,
  getCategoryDisplayName,
  getCategoryUnityName
} from './models/avatarConstants';

// ===================================
// Services
// ===================================
export { createApiError, isApiError } from './services/IAvatarApiService';
export type { ApiError, IAvatarApiService } from './services/IAvatarApiService';
export { avatarApiService } from './services/avatarService';

// ===================================
// React Query Hooks
// ===================================
export {
  avatarQueryKeys, invalidateAllAvatarCache, invalidateItemsByType, prefetchItems, useAvatarItems,
  useMainAvatar, usePurchaseAndEquipItems, usePurchaseItems,
  useUpdateEquippedItems
} from './services/avatarQueries';

// ===================================
// Utils
// ===================================
export {
  groupItemsByCategory, toAvatar, toAvatarItem,
  toAvatarItems, toEquippedItemsMap,
  toItemIds, updateItemStatus,
  updateItemStatusInArray
} from './utils/avatarDtoMapper';

