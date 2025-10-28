package com.hongtaeho.app.unity

import android.util.Log
import com.unity3d.player.UnityPlayer

/**
 * Unity Holder Singleton
 * Unity 인스턴스를 관리하고 Unity로 메시지를 전송하는 유틸리티
 * iOS의 Unity.swift와 동일한 역할 수행
 *
 * iOS: framework.sendMessageToGO(withName:functionName:message:)
 * Android: UnityPlayer.UnitySendMessage(gameObject, methodName, message)
 */
object UnityHolder {
    private const val TAG = "UnityHolder"

    /**
     * Unity로 메시지 전송
     *
     * UnityPlayer의 static 메서드 UnitySendMessage를 사용하여
     * Unity Scene의 GameObject에 메시지를 전송합니다.
     *
     * iOS의 framework.sendMessageToGO()와 동일한 기능을 수행합니다.
     *
     * @param gameObject Unity GameObject 이름 (Scene에 존재해야 함)
     * @param methodName Unity에서 호출할 메서드 이름 (public void 메서드)
     * @param message 전달할 메시지 (문자열, Unity 메서드의 string 파라미터로 전달됨)
     */
    fun sendMessage(gameObject: String, methodName: String, message: String) {
        try {
            Log.d(TAG, "Sending message to Unity: $gameObject.$methodName($message)")

            // Unity Native API 호출 (static 메서드)
            // iOS: framework.sendMessageToGO(withName: gameObject, functionName: methodName, message: message)
            // Android: UnityPlayer.UnitySendMessage(gameObject, methodName, message)

            UnityPlayer.UnitySendMessage(gameObject, methodName, message)

            Log.d(TAG, "Message sent successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error sending message to Unity: ${e.message}", e)
            throw e
        }
    }

    /**
     * Unity 인스턴스 존재 여부 확인
     * @return Unity가 초기화되었는지 여부
     */
    fun isUnityLoaded(): Boolean {
        return try {
            UnityPlayer.currentActivity != null
        } catch (e: Exception) {
            Log.w(TAG, "Unity not loaded: ${e.message}")
            false
        }
    }
}
