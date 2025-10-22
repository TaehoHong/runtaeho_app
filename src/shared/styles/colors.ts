/**
 * 달려라 태호군 앱 컬러 시스템
 *
 * Figma 디자인 시스템에서 정의된 컬러 팔레트
 * Design System > Foundation > Color
 */

/**
 * Primary Color - Product Color
 * 앱의 메인 컬러 (녹색 계열)
 */
export const PRIMARY = {
  900: '#008B0F',
  800: '#00AF1F',
  700: '#21C427',
  600: '#45DA31',
  500: '#59EC3A', // Main Color
  400: '#71F155',
  300: '#92F579',
  200: '#B5F9A3',
  100: '#D4FBC8',
  50: '#EEFEE9',
} as const;

/**
 * Grey Scale
 * 회색 계열 컬러
 */
export const GREY = {
  900: '#202020',
  800: '#414141',
  700: '#606060',
  600: '#747474',
  500: '#9D9D9D',
  400: '#B4B4B4',
  300: '#BCBCBC',
  250: '#C9C9C9',
  200: '#DFDFDF',
  100: '#EDEDED',
  50: '#FAFAFA',
  WHITE: '#FFFFFF',
} as const;

/**
 * Alert Color - System Red
 * 경고, 에러, 삭제 등에 사용
 */
export const RED = {
  DEFAULT: '#f03532',
  500: '#FF4032',
  400: '#F9514E',
  300: '#F76F71',
  200: '#F69A9A',
  100: '#FFCDD2',
  50: '#ffebee',
} as const;

/**
 * Sub Color - System Blue
 * 보조 컬러, 정보 표시 등에 사용
 */
export const BLUE = {
  SECONDARY: '#66EAF1',
  DEFAULT: '#3283ff',
  500: '#2B91FF',
  400: '#42a2ff',
  200: '#91c9ff',
  100: '#bcddff',
  50: '#e3f2ff',
} as const;

/**
 * Gradiant Color - System Yellow
 * 그라디언트, 강조 등에 사용
 */
export const GRADIANT = {
  YELLOW: '#FEDC1F',
} as const;


/**
 * 전체 컬러 익스포트
 */
export const Colors = {
  PRIMARY,
  GREY,
  RED,
  BLUE,
  GRADIANT,
} as const;

export default Colors;
