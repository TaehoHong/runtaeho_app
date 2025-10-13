/**
 * 이미지 리소스 상수
 * 모든 이미지 경로를 중앙에서 관리
 */

export const ICONS = {
  point: require('../../../assets/images/icons/point.png'),
  pencil: require('../../../assets/images/icons/pencil-line.png'),
  chevron: require('../../../assets/images/icons/chevron-right.png'),
  pixel_shoes: require('../../../assets/images/icons/pixel-shoes.png'),
  avatar: require('../../../assets/images/icons/pixel-avatar.png'),
  store: require('../../../assets/images/icons/store.png'),
  confirm: require('../../../assets/images/icons/confirm.png'),
  treshcan: require('../../../assets/images/icons/treshcan.png'),
  shoe: require('../../../assets/images/icons/shoe.png'),
  unpack: require('../../../assets/images/icons/unpack.png'),
  chart: require('../../../assets/images/icons/chart-icon.png'),
  myinfo: require('../../../assets/images/icons/myinfo-icon.png'),
} as const;

// 아이콘 이름 타입
export type IconName = keyof typeof ICONS;
