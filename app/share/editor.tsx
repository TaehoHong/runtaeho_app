/**
 * Share Editor Route
 * 러닝 기록 공유 편집 화면 라우트
 */

import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ShareEditorScreen, type ShareRunningData } from '~/features/share';

export default function ShareEditorPage() {
  const params = useLocalSearchParams<{
    distance: string;
    durationSec: string;
    pace: string;
    startTimestamp: string;
    earnedPoints: string;
  }>();

  // 파라미터 파싱
  const runningData: ShareRunningData = {
    distance: Number(params.distance) || 0,
    durationSec: Number(params.durationSec) || 0,
    pace: params.pace || '0\'00"',
    startTimestamp: params.startTimestamp || new Date().toISOString(),
    earnedPoints: Number(params.earnedPoints) || 0,
  };

  return <ShareEditorScreen runningData={runningData} />;
}
