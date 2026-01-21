package com.hongtaeho.app.unity

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import com.unity3d.player.UnityPlayer
import com.unity3d.player.UnityPlayerForActivityOrService

/**
 * Unity Holder Singleton
 * Unity 인스턴스를 관리하고 Unity로 메시지를 전송하는 유틸리티
 * iOS의 Unity.swift와 동일한 역할 수행
 *
 * Architecture: Push + Pull Pattern
 * - Push: 이벤트 발생 시 즉시 알림 (리스너 있을 때)
 * - Pull: 언제든 현재 상태 조회 가능
 * - Queue: GameObject Ready 전까지 메시지 큐잉
 *
 * iOS: framework.sendMessageToGO(withName:functionName:message:)
 * Android: UnityPlayer.UnitySendMessage(gameObject, methodName, message)
 */
object UnityHolder {
    private const val TAG = "UnityHolder"

    // MARK: - Singleton Unity Player

    /** Unity Player 싱글톤 인스턴스 */
    @Volatile
    private var _unityPlayer: UnityPlayerForActivityOrService? = null

    /** Unity Player 가져오기 (없으면 생성) */
    fun getOrCreateUnityPlayer(activity: Activity): UnityPlayerForActivityOrService {
        return _unityPlayer ?: synchronized(this) {
            _unityPlayer ?: UnityPlayerForActivityOrService(activity).also {
                _unityPlayer = it
                Log.d(TAG, "Unity Player created")
            }
        }
    }

    /** Unity Player 인스턴스 가져오기 (없으면 null) */
    fun getUnityPlayer(): UnityPlayerForActivityOrService? = _unityPlayer

    /** Unity Player View 가져오기 */
    fun getUnityView(): View? = _unityPlayer?.view

    // MARK: - State (Single Source of Truth)

    /** Charactor Ready 상태 (RNUnityBridge에서 조회 가능) */
    @Volatile
    private var _isCharactorReady: Boolean = false

    /** GameObject Ready 상태 (메시지 큐잉 제어) */
    @Volatile
    private var _isGameObjectReady: Boolean = false

    /** 메시지 큐 (GameObject Ready 전까지 메시지 저장) */
    private val messageQueue = mutableListOf<QueuedMessage>()

    /** 메시지 큐 동기화를 위한 락 */
    private val queueLock = Any()

    /** 앱 활성 상태 */
    @Volatile
    private var _isAppActive: Boolean = true

    /** Charactor Ready 콜백 리스너 (RNUnityBridgeModule에서 설정) */
    var onCharactorReadyListener: (() -> Unit)? = null

    /** Main Thread Handler */
    private val mainHandler = Handler(Looper.getMainLooper())

    // MARK: - State Accessors

    /** Charactor Ready 상태 조회 (Pull Pattern) */
    val isCharactorReady: Boolean
        get() = _isCharactorReady

    /** GameObject Ready 상태 조회 */
    val isGameObjectReady: Boolean
        get() = _isGameObjectReady

    /** 앱 활성 상태 조회 */
    val isAppActive: Boolean
        get() = _isAppActive

    // MARK: - State Management

    /**
     * Unity에서 호출되는 Charactor Ready 알림
     * UnityNativeBridge.notifyCharactorReady()를 통해 호출됨
     *
     * Main Thread에서 실행되어야 함
     */
    fun notifyCharactorReady() {
        Log.d(TAG, "notifyCharactorReady() called")

        // Main Thread에서 실행 보장
        if (Looper.myLooper() != Looper.getMainLooper()) {
            mainHandler.post { notifyCharactorReady() }
            return
        }

        synchronized(queueLock) {
            _isCharactorReady = true
            _isGameObjectReady = true

            // 대기 중인 메시지 처리
            val count = messageQueue.size
            Log.d(TAG, "GameObject Ready! Processing $count queued messages...")

            val messagesToProcess = messageQueue.toList()
            messageQueue.clear()

            messagesToProcess.forEach { msg ->
                sendMessageImmediate(msg.gameObject, msg.methodName, msg.message)
            }
        }

        // 리스너에게 알림 (Push Pattern)
        Log.d(TAG, "Notifying Charactor Ready listener")
        onCharactorReadyListener?.invoke()
    }

    /**
     * Ready 상태 리셋 (View 리마운트 시 호출)
     * iOS의 resetCharactorReady()와 동일
     */
    fun resetCharactorReady() {
        Log.d(TAG, "resetCharactorReady() called")

        synchronized(queueLock) {
            _isCharactorReady = false
            // Note: _isGameObjectReady는 리셋하지 않음 (Unity가 이미 초기화되어 있으면 유지)
            messageQueue.clear()
        }

        // Unity가 이미 로드되어 있으면 상태 유지
        if (isUnityLoaded()) {
            _isCharactorReady = true
            Log.d(TAG, "Unity already loaded, keeping state true")
        }
    }

    // MARK: - State Validation

    /**
     * Unity 상태 유효성 검사
     * 앱 업데이트 후 stale 상태 감지
     * iOS의 Unity.validateState()와 동일한 기능
     *
     * @return 상태가 유효하면 true, stale 상태이면 false
     */
    fun validateState(): Boolean {
        // Unity Player가 있는데 Activity가 없으면 stale
        if (_unityPlayer != null && UnityPlayer.currentActivity == null) {
            Log.w(TAG, "⚠️ Stale state detected: player exists but no activity")
            return false
        }

        // 앱이 active인데 Unity가 초기화 안됨
        if (_isAppActive && _unityPlayer == null) {
            Log.w(TAG, "⚠️ State mismatch: app active but no Unity player")
            return false
        }

        return true
    }

    /**
     * Stale 상태 강제 리셋
     * iOS의 Unity.forceReset()과 동일한 기능
     * 앱 업데이트 후 stale 상태 복구에 사용
     */
    fun forceReset() {
        Log.d(TAG, "🔄 Force resetting stale Unity state")

        synchronized(queueLock) {
            _isCharactorReady = false
            _isGameObjectReady = false
            messageQueue.clear()
        }

        _isAppActive = true
        // Note: _unityPlayer는 null로 설정하지 않음 (재생성 필요시 getOrCreateUnityPlayer 호출)

        Log.d(TAG, "✅ Force reset completed")
    }

    // MARK: - Lifecycle Management

    /**
     * 앱이 Pause 상태로 전환될 때 호출
     * Unity Player의 onPause()를 호출하여 렌더링을 중지함
     */
    fun onPause() {
        Log.d(TAG, "onPause()")
        _isAppActive = false
        _unityPlayer?.onPause()  // Unity 렌더링 중지
    }

    /**
     * 앱이 Resume 상태로 전환될 때 호출
     * Unity Player의 onResume()을 호출하여 렌더링을 재개함
     */
    fun onResume() {
        Log.d(TAG, "onResume()")
        _isAppActive = true
        _unityPlayer?.onResume()  // Unity 렌더링 재개

        // Resume 시 대기 중인 메시지 처리
        synchronized(queueLock) {
            if (_isGameObjectReady && messageQueue.isNotEmpty()) {
                Log.d(TAG, "Processing ${messageQueue.size} queued messages on resume")
                val messagesToProcess = messageQueue.toList()
                messageQueue.clear()

                messagesToProcess.forEach { msg ->
                    sendMessageImmediate(msg.gameObject, msg.methodName, msg.message)
                }
            }
        }
    }

    // MARK: - Message Sending

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
        Log.d(TAG, "sendMessage: $gameObject.$methodName($message)")

        // 앱이 비활성 상태이면 큐잉
        if (!_isAppActive) {
            Log.d(TAG, "App not active, queuing message")
            synchronized(queueLock) {
                messageQueue.add(QueuedMessage(gameObject, methodName, message))
            }
            return
        }

        // GameObject가 준비되지 않았으면 큐잉
        synchronized(queueLock) {
            if (!_isGameObjectReady) {
                Log.d(TAG, "GameObject not ready, queuing message")
                messageQueue.add(QueuedMessage(gameObject, methodName, message))
                return
            }
        }

        sendMessageImmediate(gameObject, methodName, message)
    }

    /**
     * 즉시 메시지 전송 (상태 체크 없이)
     */
    private fun sendMessageImmediate(gameObject: String, methodName: String, message: String) {
        try {
            Log.d(TAG, "Sending message to Unity: $gameObject.$methodName($message)")

            // Main Thread에서 실행 보장
            if (Looper.myLooper() != Looper.getMainLooper()) {
                mainHandler.post {
                    sendMessageImmediate(gameObject, methodName, message)
                }
                return
            }

            // Unity Native API 호출 (static 메서드)
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
            _unityPlayer != null || UnityPlayer.currentActivity != null
        } catch (e: Exception) {
            Log.w(TAG, "Unity not loaded: ${e.message}")
            false
        }
    }

    // MARK: - Data Classes

    /**
     * 큐에 저장할 메시지 데이터 클래스
     */
    private data class QueuedMessage(
        val gameObject: String,
        val methodName: String,
        val message: String
    )
}
