import { getHairColorByHex } from '~/features/avatar/models/avatarConstants';
import type { Item } from '~/features/avatar/models/Item';
import { resolveAvatarItemImage } from '~/features/avatar/utils/avatarItemImageResolver';
import { HAIR_COLOR_IMAGES } from '~/shared/constants/generated/hairColorImages.generated';

function createHairItem(name: string): Item {
  return {
    id: 1,
    name,
    itemType: {
      id: 1,
      name: '머리',
    },
    unityFilePath: 'Assets/05.Resource/Hair/',
    filePath: '/assets/items/Hair/',
    point: 0,
    createdAt: new Date().toISOString(),
  };
}

describe('avatar hair color contract', () => {
  it('maps backend black hex (#000000) to black hair color id', () => {
    expect(getHairColorByHex('#000000')?.id).toBe(1);
  });

  it('resolves hair image from black color set when backend returns #000000', () => {
    const hairItem = createHairItem('New_Hair_01');
    const resolved = resolveAvatarItemImage(hairItem, '#000000');

    expect(resolved).toBe(HAIR_COLOR_IMAGES[1]!.New_Hair_01);
  });
});
