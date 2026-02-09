/**
 * GPS to SVG Path Utility
 * GPS 좌표를 SVG Path로 변환하는 유틸리티
 */

import type { Location } from '~/features/running/models';

/**
 * SVG Path 데이터 인터페이스
 */
export interface SVGPathData {
  /** SVG path d 속성 */
  path: string;
  /** 시작점 좌표 */
  startPoint: { x: number; y: number };
  /** 종료점 좌표 */
  endPoint: { x: number; y: number };
}

/**
 * GPS 좌표를 SVG Path로 변환
 *
 * @param locations GPS 좌표 배열
 * @param viewBox SVG ViewBox 크기
 * @param padding 패딩 (기본값: 20)
 * @returns SVG Path 데이터 또는 좌표가 부족할 경우 null
 */
export function gpsToSVGPath(
  locations: Location[],
  viewBox: { width: number; height: number },
  padding: number = 20
): SVGPathData | null {
  // 최소 2개 이상의 좌표 필요
  if (locations.length < 2) {
    return null;
  }

  // 1. 위경도 범위 계산
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const loc of locations) {
    minLat = Math.min(minLat, loc.latitude);
    maxLat = Math.max(maxLat, loc.latitude);
    minLng = Math.min(minLng, loc.longitude);
    maxLng = Math.max(maxLng, loc.longitude);
  }

  // 범위가 너무 작을 경우 (거의 같은 위치) 최소 범위 설정
  const MIN_RANGE = 0.0001; // 약 11m
  const latRange = Math.max(maxLat - minLat, MIN_RANGE);
  const lngRange = Math.max(maxLng - minLng, MIN_RANGE);

  // 2. 정규화 및 SVG 좌표로 변환
  const usableWidth = viewBox.width - padding * 2;
  const usableHeight = viewBox.height - padding * 2;

  // 가로/세로 비율 유지를 위한 스케일 계산
  const scale = Math.min(usableWidth / lngRange, usableHeight / latRange);

  // 중앙 정렬을 위한 오프셋 계산
  const offsetX = padding + (usableWidth - lngRange * scale) / 2;
  const offsetY = padding + (usableHeight - latRange * scale) / 2;

  // GPS → SVG 좌표 변환 함수
  const toSVGCoord = (loc: Location): { x: number; y: number } => ({
    x: offsetX + (loc.longitude - minLng) * scale,
    // Y축은 반전 (SVG는 위에서 아래로, GPS는 아래에서 위로)
    y: viewBox.height - (offsetY + (loc.latitude - minLat) * scale),
  });

  // 3. SVG Path 생성 (Quadratic Bezier 곡선)
  const points = locations.map(toSVGCoord);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (!firstPoint || !lastPoint) {
    return null;
  }

  let pathD = `M ${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)}`;

  // 2개 좌표만 있으면 직선
  if (points.length === 2) {
    pathD += ` L ${lastPoint.x.toFixed(2)} ${lastPoint.y.toFixed(2)}`;
  } else {
    // 3개 이상: Quadratic Bezier 곡선으로 부드럽게 연결
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      if (!prev || !curr || !next) continue;

      // 현재 점을 제어점으로, 다음 점과의 중간점을 끝점으로
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;

      pathD += ` Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
    }

    // 마지막 점으로 연결 (마지막 두 점 사이)
    const secondLast = points[points.length - 2];
    if (secondLast) {
      pathD += ` Q ${secondLast.x.toFixed(2)} ${secondLast.y.toFixed(2)} ${lastPoint.x.toFixed(2)} ${lastPoint.y.toFixed(2)}`;
    }
  }

  return {
    path: pathD,
    startPoint: firstPoint,
    endPoint: lastPoint,
  };
}
