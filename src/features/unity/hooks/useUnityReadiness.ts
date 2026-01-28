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
  const setGameObjectReady = useUnityStore((state) => state.setGameObjectReady);
  const setAvatarReady = useUnityStore((state) => state.setAvatarReady);
  const resetReadyStates = useUnityStore((state) => state.resetReadyStates);

  // 로컬 상태 (Unity 시작 여부만 로컬로 관리)
  const [isUnityStarted, setIsUnityStarted] = useState(false);
  const hasCalledOnReadyRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ★ handleUnityReady에서 생성된 구독 저장 (메모리 누수 방지)
  const unityReadyUnsubscribeRef = useRef<(() => void) | null>(null);

  // Unity 사용 가능 여부 (iOS만 지원)
  const isUnityAvailable = Platform.OS === 'ios';

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
   * ★ 반환된 unsubscribe를 ref에 저장하여 cleanup 시 호출
   */
  const handleUnityReady = useCallback(
    (event: any) => {
      console.log('[useUnityReadiness] Unity View Ready:', event?.nativeEvent);

      // ★ 이전 구독 정리
      if (unityReadyUnsubscribeRef.current) {
        unityReadyUnsubscribeRef.current();
        unityReadyUnsubscribeRef.current = null;
      }

      // unityService.onReady는 Push + Pull 패턴으로 안전하게 처리
      const unsubscribe = unityService.onReady(() => {
        console.log('[useUnityReadiness] GameObject Ready!');
        // Store는 UnityBridge에서 이미 업데이트됨
        // 여기서는 추가 작업 불필요 (콜백 체이닝만)
      });

      // ★ ref에 저장 (cleanup 시 사용)
      unityReadyUnsubscribeRef.current = unsubscribe;
    },
    []
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
   * 타임아웃 처리
   */
  useEffect(() => {
    if (!timeout || isReady) return;

    console.log(`[useUnityReadiness] 타임아웃 설정: ${timeout}ms`);

    timeoutRef.current = setTimeout(() => {
      console.log('[useUnityReadiness] 타임아웃 - 강제 ready 처리');
      setGameObjectReady(true);
      if (waitForAvatar) {
        setAvatarReady(true);
      }
    }, timeout);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [timeout, isReady, waitForAvatar, setGameObjectReady, setAvatarReady]);

  /**
   * onReady 콜백 실행
   */
  useEffect(() => {
    if (isReady && onReady && !hasCalledOnReadyRef.current) {
      console.log('[useUnityReadiness] onReady 콜백 실행');
      hasCalledOnReadyRef.current = true;

      // 타임아웃 정리
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      onReady();
    }
  }, [isReady, onReady]);

  /**
   * 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (startDelayTimerRef.current) {
        clearTimeout(startDelayTimerRef.current);
      }
      // ★ unityService.onReady 구독 정리
      if (unityReadyUnsubscribeRef.current) {
        unityReadyUnsubscribeRef.current();
        unityReadyUnsubscribeRef.current = null;
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
