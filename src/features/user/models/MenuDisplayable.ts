/**
 * Menu Displayable Interface
 * Swift MenuDisplayable protocol에서 마이그레이션
 *
 * React Native에서는 컴포넌트 기반이므로 interface로 메뉴 정보만 정의
 */

export interface MenuDisplayableConfig {
  menuTitle: string;
  menuOrder: number;
  isEnabled: boolean;
  componentName: string; // React 컴포넌트 식별자
}

/**
 * 메뉴 타입 정의
 */
export enum MenuType {
  USER_ACCOUNT_CONNECTION = 'UserAccountConnection',
  TERMS_OF_SERVICE = 'TermsOfService',
  NOTICE = 'Notice',
}

/**
 * 메뉴 레지스트리
 * Swift MenuRegistry에서 마이그레이션
 */
export const MenuRegistry: Record<MenuType, MenuDisplayableConfig> = {
  [MenuType.USER_ACCOUNT_CONNECTION]: {
    menuTitle: '계정 연결',
    menuOrder: 1,
    isEnabled: true,
    componentName: 'UserAccountConnectionView',
  },
  [MenuType.TERMS_OF_SERVICE]: {
    menuTitle: '이용약관',
    menuOrder: 2,
    isEnabled: true,
    componentName: 'TermsOfServiceView',
  },
  [MenuType.NOTICE]: {
    menuTitle: '공지사항',
    menuOrder: 3,
    isEnabled: true,
    componentName: 'NoticeView',
  },
};

/**
 * 활성화된 메뉴 목록 반환
 * Swift enabledMenus computed property와 동일
 */
export const getEnabledMenus = (): { title: string; config: MenuDisplayableConfig }[] => {
  return Object.values(MenuRegistry)
    .filter((config) => config.isEnabled)
    .sort((a, b) => a.menuOrder - b.menuOrder)
    .map((config) => ({
      title: config.menuTitle,
      config,
    }));
};

/**
 * 메뉴 타입으로 설정 조회
 */
export const getMenuConfig = (menuType: MenuType): MenuDisplayableConfig => {
  return MenuRegistry[menuType];
};

/**
 * 컴포넌트 이름으로 메뉴 타입 조회
 */
export const getMenuTypeByComponentName = (componentName: string): MenuType | undefined => {
  return Object.keys(MenuRegistry).find(
    (key) => MenuRegistry[key as MenuType].componentName === componentName
  ) as MenuType | undefined;
};