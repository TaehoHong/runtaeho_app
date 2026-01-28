package com.hongtaeho.app.unity

import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * Unity Native Bridge
 * Unity C#에서 AndroidJavaClass를 통해 호출되는 정적 메서드들
 *
 * Unity에서 호출하는 방법 (C#):
 * ```csharp
 * #if UNITY_ANDROID && !UNITY_EDITOR
 * using (AndroidJavaClass bridgeClass = new AndroidJavaClass("com.hongtaeho.app.unity.UnityNativeBridge"))
 * {
 *     bridgeClass.CallStatic("notifyCharactorReady");
 * }
 * #endif
 * ```
 *
 * iOS의 _notifyCharactorReady()와 동일한 역할
 */
object UnityNativeBridge {
    private const val TAG = "UnityNativeBridge"

    /** Main Thread Handler */
    private val mainHandler = Handler(Looper.getMainLooper())

    /**
     * Unity C#에서 호출되는 Charactor Ready 알림
     *
     * @JvmStatic - Java에서 정적 메서드로 호출 가능하게 함
     * Unity의 AndroidJavaClass.CallStatic()에서 호출됨
     */
    @JvmStatic
    fun notifyCharactorReady() {
        Log.d(TAG, "notifyCharactorReady() called from Unity C#")

        // Main Thread에서 UnityHolder로 전달
        mainHandler.post {
            try {
                UnityHolder.notifyCharactorReady()
                Log.d(TAG, "Successfully notified UnityHolder")
            } catch (e: Exception) {
                Log.e(TAG, "Error notifying UnityHolder: ${e.message}", e)
            }
        }
    }

    /**
     * Unity C#에서 호출되는 Avatar Ready 알림
     * SetSprites() 완료 시 호출됨
     *
     * @JvmStatic - Java에서 정적 메서드로 호출 가능하게 함
     * Unity의 AndroidJavaClass.CallStatic()에서 호출됨
     */
    @JvmStatic
    fun notifyAvatarReady() {
        Log.d(TAG, "notifyAvatarReady() called from Unity C#")

        mainHandler.post {
            try {
                UnityHolder.notifyAvatarReady()
                Log.d(TAG, "Successfully notified UnityHolder: Avatar Ready")
            } catch (e: Exception) {
                Log.e(TAG, "Error notifying UnityHolder Avatar Ready: ${e.message}", e)
            }
        }
    }

    /**
     * Unity에서 캐릭터 상태 변경 시 호출
     * 확장 가능한 콜백 메서드
     *
     * @param state 캐릭터 상태 (JSON 문자열)
     */
    @JvmStatic
    fun notifyCharacterStateChanged(state: String) {
        Log.d(TAG, "notifyCharacterStateChanged() called with state: $state")

        mainHandler.post {
            try {
                // 향후 확장: 캐릭터 상태 변경 이벤트 처리
                Log.d(TAG, "Character state changed: $state")
            } catch (e: Exception) {
                Log.e(TAG, "Error handling character state change: ${e.message}", e)
            }
        }
    }

    /**
     * Unity에서 에러 발생 시 호출
     *
     * @param errorType 에러 타입
     * @param message 에러 메시지
     */
    @JvmStatic
    fun notifyError(errorType: String, message: String) {
        Log.e(TAG, "notifyError() called - type: $errorType, message: $message")

        mainHandler.post {
            try {
                // 향후 확장: 에러 이벤트를 React Native로 전달
                Log.e(TAG, "Unity error - $errorType: $message")
            } catch (e: Exception) {
                Log.e(TAG, "Error handling Unity error: ${e.message}", e)
            }
        }
    }
}
