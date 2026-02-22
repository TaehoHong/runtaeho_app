import type { ImageSourcePropType } from 'react-native';
import { DEFAULT_HAIR_COLOR, getHairColorByHex } from '~/features/avatar/models/avatarConstants';
import { ItemTypeId, type Item } from '~/features/avatar/models/Item';
import { ITEM_IMAGE, type ItemImage } from '~/shared/constants/images';
import { HAIR_COLOR_IMAGES } from '~/shared/constants/generated/hairColorImages.generated';

function stripPngExtension(name: string): string {
  return name.replace(/\.png$/i, '');
}

function resolveFromItemImageMap(name: string): ImageSourcePropType | undefined {
  if (name in ITEM_IMAGE) {
    return ITEM_IMAGE[name as ItemImage];
  }
  return undefined;
}

/**
 * Avatar 아이템 이미지 선택 로직
 * - Hair: 선택한 헤어 색상 기반 사전 생성 에셋 우선
 * - Non-Hair: 기존 ITEM_IMAGE 사용
 */
export function resolveAvatarItemImage(
  item: Item,
  hairColorHex: string
): ImageSourcePropType | undefined {
  const normalizedName = stripPngExtension(item.name);

  if (item.itemType.id === ItemTypeId.HAIR) {
    const selectedHairColorId = getHairColorByHex(hairColorHex)?.id ?? DEFAULT_HAIR_COLOR.id;
    const selectedHairSet = HAIR_COLOR_IMAGES[selectedHairColorId];
    const defaultHairSet = HAIR_COLOR_IMAGES[DEFAULT_HAIR_COLOR.id];

    const selectedImage = selectedHairSet?.[normalizedName];
    if (selectedImage !== undefined) {
      return selectedImage;
    }

    const fallbackHairImage = defaultHairSet?.[normalizedName];
    if (fallbackHairImage !== undefined) {
      return fallbackHairImage;
    }
  }

  return (
    resolveFromItemImageMap(normalizedName) ??
    resolveFromItemImageMap(item.name)
  );
}
