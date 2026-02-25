/**
 * useUnityReadiness
 * Unity 준비 상태를 통합 관리하는 Hook
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useUnityStore } from '~/stores/unity/unityStore';
import { unityService } from '~/features/unity/services/UnityService';
import type { UnityReadyEvent } from '../bridge/UnityBridge';

export interface UseUnityReadinessOptions {
  /**
   * 아바타 준비까지 대기할지 여부
   * true: GameObject Ready + Avatar Ready 모두 필요
   * false: GameObject Ready만 필요
   * @default true
   */
  waitForAvatar?: boolean;

  /**
   * 준비 완료 후 실행할 콜백
   */
  onReady?: () => void;

  /**
   * 타임아웃 (ms)
   * 지정 시간 내에 준비되지 않으면 강제로 ready 처리
   * @default undefined (타임아웃 없음)
   */
  timeout?: number;

  /**
   * Unity 시작 지연 시간 (ms)
   * Cold Start 크래시 방지를 위해 Unity 컴포넌트 마운트 지연
   * @default 500
   */
  startDelay?: number;

  /**
   * 자동으로 Unity를 시작할지 여부
   * false로 설정하면 수동으로 startUnity() 호출 필요
   * @default true
   */
  autoStart?: boolean;
}

export interface UseUnityReadinessReturn {
  /**
   * Unity 전체 준비 완료 여부
   * waitForAvatar에 따라 Avatar Ready 포함 여부 결정
   */
  isReady: boolean;

  /**
   * 아바타 적용 완료 여부
   */
  isAvatarApplied: boolean;

  /**
   * 메시지 전송 가능 여부 (GameObject Ready)
   */
  canSendMessage: boolean;

  /**
   * Unity가 시작되었는지 여부
   */
  isUnityStarted: boolean;

  /**
   * Unity가 iOS에서 사용 가능한지 여부
   */
  isUnityAvailable: boolean;

  /**
   * UnityView의 onUnityReady에 전달할 핸들러
   * ★ 타입 개선: UnityReadyEvent 사용
   */
  handleUnityReady: (event: UnityReadyEvent) => void;

  /**
   * Unity 수동 시작 (autoStart: false일 때 사용)
   */
  startUnity: () => void;

  /**
   * 상태 리셋 함수
   */
  reset: () => void;
}

/**
 * Unity 준비 상태 통합 관리 Hook
 *
 * @example
 * // 기본 사용 (아바타 준비까지 대기)
 * const { isReady, handleUnityReady } = useUnityReadiness({
 *   onReady: () => console.log('Unity 완전 준비!'),
 * });
 *
 * @example
 * // GameObject만 준비되면 OK (아바타 로딩 안 기다림)
 * const { isReady, handleUnityReady } = useUnityReadiness({
 *   waitForAvatar: false,
 * });
 *
 * @example
 * // 수동 시작
 * const { isReady, startUnity, handleUnityReady } = useUnityReadiness({
 *   autoStart: false,
 * });
 * // 특정 조건에서 수동으로 시작
 * useEffect(() => {
 *   if (someCondition) startUnity();
 * }, [someCondition, startUnity]);
 */
export const useUnityReadiness = (
  options: UseUnityReadinessOptions = {}
): UseUnityReadinessReturn => {
  const {
    waitForAvatar = true,
    onReady,
    timeout,
    startDelay = 500,
    autoStart = true,
  } = options;

  // Store 상태 구독
  const isGameObjectReady = useUnityStore((state) => state.isGameObjectReady);
  const isAvatarReady = useUnityStore((state) => state.isAvatarReady);
  const error = useUnityStore((state) => state.error);

  // Store 액션
  const resetReadyStates = useUnityStore((state) => state.resetReadyStates);

  // 로컬 상태 (Unity 시작 여부만 로컬로 관리)
  const [isUnityStarted, setIsUnityStarted] = useState(false);
  const hasCalledOnReadyRef = useRef(false);
  const startDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitRequestIdRef = useRef(0);

  // Unity 사용 가능 여부 (iOS, Android 지원)
  const isUnityAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

  // 준비 완료 판단
  const isFullyReady = isGameObjectReady && isAvatarReady && !error;
  const canSendMessage = isGameObjectReady && !error;
  const isReady = waitForAvatar ? isFullyReady : canSendMessage;

  /**
   * Unity 시작 함수
   */
  const startUnity = useCallback(() => {
    if (isUnityStarted) return;

    console.log(`[useUnityReadiness] Unity 시작 예약 (${startDelay}ms 지연)`);

    startDelayTimerRef.current = setTimeout(() => {
      console.log('[useUnityReadiness] Unity 시작');
      setIsUnityStarted(true);
    }, startDelay);
  }, [startDelay, isUnityStarted]);

  /**
   * 상태 리셋
   */
  const reset = useCallback(() => {
    console.log('[useUnityReadiness] 상태 리셋');
    hasCalledOnReadyRef.current = false;
    resetReadyStates();
  }, [resetReadyStates]);

  /**
   * UnityView onUnityReady 핸들러
   * Service 오케스트레이터로 ready 대기 로직 위임
   */
  const handleUnityReady = useCallback(
    (event: UnityReadyEvent) => {
      console.log('[useUnityReadiness] Unity View Ready:', event?.nativeEvent);
      const requestId = waitRequestIdRef.current + 1;
      waitRequestIdRef.current = requestId;

      void unityService
        .waitForReady({
          waitForAvatar,
          timeoutMs: timeout,
          forceReadyOnTimeout: true,
        })
        .then((result) => {
          // 최신 요청만 반영
          if (requestId !== waitRequestIdRef.current) {
            return;
          }
          if (result.timedOut) {
            console.warn(
              `[useUnityReadiness] waitForReady timed out (waitForAvatar=${waitForAvatar})`
            );
          }
        })
        .catch((waitError) => {
          console.error('[useUnityReadiness] waitForReady failed:', waitError);
        });
    },
    [timeout, waitForAvatar]
  );

  /**
   * 자동 시작 (autoStart: true)
   */
  useEffect(() => {
    if (autoStart && isUnityAvailable) {
      startUnity();
    }

    return () => {
      if (startDelayTimerRef.current) {
        clearTimeout(startDelayTimerRef.current);
        startDelayTimerRef.current = null;
      }
    };
  }, [autoStart, isUnityAvailable, startUnity]);

  /**
   * onReady 콜백 실행
   */
  useEffect(() => {
    if (isReady && onReady && !hasCalledOnReadyRef.current) {
      console.log('[useUnityReadiness] onReady 콜백 실행');
      hasCalledOnReadyRef.current = true;

      onReady();
    }
  }, [isReady, onReady]);

  /**
   * 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      if (startDelayTimerRef.current) {
        clearTimeout(startDelayTimerRef.current);
      }
    };
  }, []);

  return {
    isReady,
    isAvatarApplied: isAvatarReady,
    canSendMessage,
    isUnityStarted,
    isUnityAvailable,
    handleUnityReady,
    startUnity,
    reset,
  };
};
