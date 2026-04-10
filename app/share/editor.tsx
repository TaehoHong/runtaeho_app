/**
 * Share Editor Route
 * 러닝 기록 공유 편집 화면 라우트
 *
 * GPS locations 배열은 URL params로 전달할 수 없어서
 * shareStore에서 데이터를 읽어옵니다.
 */

import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { router } from 'expo-router';
import { ShareEditorScreen } from '~/features/share';
import { useShareEntryTransitionStore } from '~/features/share/stores/shareEntryTransitionStore';
import { useShareStore } from '~/features/share/stores/shareStore';

export default function ShareEditorPage() {
  const shareData = useShareStore((state) => state.shareData);
  const clearShareData = useShareStore((state) => state.clearShareData);
  const endEntryTransition = useShareEntryTransitionStore((state) => state.endEntryTransition);

  // 데이터가 없으면 뒤로 이동
  // (직접 URL로 접근하거나, store가 비어있는 경우)
  useEffect(() => {
    if (!shareData) {
      console.warn('⚠️ [ShareEditorPage] shareData가 없습니다. 뒤로 이동합니다.');
      endEntryTransition();
      router.back();
    }
  }, [endEntryTransition, shareData]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('[SHARE_EDITOR] 뒤로가기 차단됨');
      return true;
    });

    return () => backHandler.remove();
  }, []);

  // 화면 언마운트 시 store 정리
  useEffect(() => {
    return () => {
      endEntryTransition();
      clearShareData();
    };
  }, [clearShareData, endEntryTransition]);

  // 데이터가 없으면 렌더링하지 않음
  if (!shareData) {
    return null;
  }

  return <ShareEditorScreen runningData={shareData} />;
}
