import { resolveAvatarItemImage } from '~/features/avatar/utils/avatarItemImageResolver';
import { DEFAULT_HAIR_COLOR } from '~/features/avatar/models/avatarConstants';
import type { Item } from '~/features/avatar/models/Item';
import { HAIR_COLOR_IMAGES } from '~/shared/constants/generated/hairColorImages.generated';
import { ITEM_IMAGE } from '~/shared/constants/images';

function createItem({
  name,
  itemTypeId,
}: {
  name: string;
  itemTypeId: number;
}): Item {
  return {
    id: 1,
    name,
    itemType: {
      id: itemTypeId,
      name: itemTypeId === 1 ? '머리' : '의상',
    },
    unityFilePath: 'Assets/05.Resource/Hair/',
    filePath: '/assets/items/Hair/',
    point: 0,
    createdAt: new Date().toISOString(),
  };
}

describe('resolveAvatarItemImage', () => {
  it('returns colorized hair image for selected hair color', () => {
    const hairItem = createItem({ name: 'New_Hair_01', itemTypeId: 1 });

    const resolved = resolveAvatarItemImage(hairItem, '#000000');

    expect(resolved).toBe(HAIR_COLOR_IMAGES[1]!.New_Hair_01);
  });

  it('supports item name with .png extension', () => {
    const hairItem = createItem({ name: 'New_Hair_01.png', itemTypeId: 1 });

    const resolved = resolveAvatarItemImage(hairItem, '#8B4513');

    expect(resolved).toBe(HAIR_COLOR_IMAGES[2]!.New_Hair_01);
  });

  it('returns default hair color image when hair color hex is unknown', () => {
    const hairItem = createItem({ name: 'New_Hair_02', itemTypeId: 1 });

    const resolved = resolveAvatarItemImage(hairItem, '#ABCDEF');

    expect(resolved).toBe(HAIR_COLOR_IMAGES[DEFAULT_HAIR_COLOR.id]!.New_Hair_02);
  });

  it('returns existing non-hair image from ITEM_IMAGE', () => {
    const clothItem = createItem({ name: 'New_Cloth_01', itemTypeId: 2 });

    const resolved = resolveAvatarItemImage(clothItem, '#000000');

    expect(resolved).toBe(ITEM_IMAGE.New_Cloth_01);
  });

  it('returns undefined safely when image key does not exist', () => {
    const missingHairItem = createItem({ name: 'Not_Existing_Hair_99', itemTypeId: 1 });

    const resolved = resolveAvatarItemImage(missingHairItem, '#000000');

    expect(resolved).toBeUndefined();
  });
});
