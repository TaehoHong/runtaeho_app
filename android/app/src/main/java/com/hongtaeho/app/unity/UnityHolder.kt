package com.hongtaeho.app.unity

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
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
    private const val ACTIVITY_RECOVERY_GRACE_MS = 1200L
    private const val ACTIVITY_RECHECK_DELAY_MS = 120L

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

    /** 실제 Unity Ready 이벤트를 최소 1회라도 수신했는지 여부 */
    @Volatile
    private var _hasEverBeenReady: Boolean = false

    /** 메시지 큐 (GameObject Ready 전까지 메시지 저장) */
    private val messageQueue = mutableListOf<QueuedMessage>()

    /** 메시지 큐 동기화를 위한 락 */
    private val queueLock = Any()

    /** 앱 활성 상태 */
    @Volatile
    private var _isAppActive: Boolean = true

    /** 마지막 Resume 시각 (transient 상태 필터링용) */
    @Volatile
    private var _lastResumeAtMillis: Long = SystemClock.elapsedRealtime()

    /** Charactor Ready 콜백 리스너 (RNUnityBridgeModule에서 설정) */
    var onCharactorReadyListener: (() -> Unit)? = null

    /** Avatar Ready 콜백 리스너 (RNUnityBridgeModule에서 설정) */
    var onAvatarReadyListener: (() -> Unit)? = null

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

    /**
     * Unity 엔진 준비 상태 조회
     * iOS의 isEngineReady와 동일한 기능
     *
     * @return Unity Player가 존재하고 활성 상태이면 true
     */
    val isUnityReady: Boolean
        get() = _unityPlayer != null && _isAppActive && isUnityLoaded()

    // MARK: - Initialization

    /**
     * Unity 엔진 초기화
     * iOS의 initializeUnityEngine과 동일한 기능
     *
     * Note: Android에서는 Unity Player가 Activity 기반으로 생성되므로
     * 실제 초기화는 RNUnityViewManager에서 수행됨.
     * 이 메서드는 상태 플래그만 설정하고 준비 상태를 확인함.
     */
    fun initialize() {
        Log.d(TAG, "initialize() called")

        // 앱 활성 상태 설정
        _isAppActive = true
        _lastResumeAtMillis = SystemClock.elapsedRealtime()

        // Unity Player가 이미 존재하면 로그만 출력
        if (_unityPlayer != null) {
            Log.d(TAG, "Unity Player already exists")
        } else {
            Log.d(TAG, "Unity Player not yet created - will be created when UnityView is mounted")
        }
    }

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
            _hasEverBeenReady = true

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
     * Unity에서 호출되는 Avatar Ready 알림
     * SetSprites() 완료 시 UnityNativeBridge를 통해 호출됨
     *
     * Main Thread에서 실행되어야 함
     */
    fun notifyAvatarReady() {
        Log.d(TAG, "notifyAvatarReady() called")

        // Main Thread에서 실행 보장
        if (Looper.myLooper() != Looper.getMainLooper()) {
            mainHandler.post { notifyAvatarReady() }
            return
        }

        // 리스너에게 알림 (Push Pattern)
        Log.d(TAG, "Notifying Avatar Ready listener")
        onAvatarReadyListener?.invoke()
    }

    /**
     * Ready 상태 리셋 (View 리마운트 시 호출)
     * iOS의 resetCharactorReady()와 동일
     */
    fun resetCharactorReady() {
        Log.d(TAG, "resetCharactorReady() called")

        synchronized(queueLock) {
            _isCharactorReady = false
            _isGameObjectReady = false
            messageQueue.clear()
        }

        // Unity가 이미 로드되어 있으면 상태 유지
        if (isUnityLoaded() && _hasEverBeenReady) {
            _isCharactorReady = true
            _isGameObjectReady = true
            Log.d(TAG, "Unity already loaded, keeping ready states true")
        }
    }

    private fun flushQueuedMessagesIfReady(reason: String) {
        val messagesToProcess = mutableListOf<QueuedMessage>()

        synchronized(queueLock) {
            if (!_isGameObjectReady || messageQueue.isEmpty()) {
                return
            }

            messagesToProcess.addAll(messageQueue)
            messageQueue.clear()
        }

        Log.d(TAG, "Flushing ${messagesToProcess.size} queued messages ($reason)")
        messagesToProcess.forEach { msg ->
            sendMessageImmediate(msg.gameObject, msg.methodName, msg.message)
        }
    }

    private fun recoverReadyStateIfPossible(reason: String): Boolean {
        val hasPlayer = _unityPlayer != null
        val hasActivity = UnityPlayer.currentActivity != null
        val isLoaded = isUnityLoaded()
        val appActive = _isAppActive
        val hasEverReady = _hasEverBeenReady

        if (!hasPlayer || !hasActivity || !isLoaded || !appActive || !hasEverReady) {
            Log.d(
                TAG,
                "Ready recovery skipped ($reason): hasPlayer=$hasPlayer, hasActivity=$hasActivity, isLoaded=$isLoaded, isAppActive=$appActive, hasEverReady=$hasEverReady"
            )
            return false
        }

        var changedToReady = false
        synchronized(queueLock) {
            val wasReady = _isCharactorReady && _isGameObjectReady
            _isCharactorReady = true
            _isGameObjectReady = true
            changedToReady = !wasReady
        }

        if (changedToReady) {
            Log.d(TAG, "Recovered ready state ($reason)")
            if (Looper.myLooper() == Looper.getMainLooper()) {
                onCharactorReadyListener?.invoke()
            } else {
                mainHandler.post {
                    onCharactorReadyListener?.invoke()
                }
            }
        }

        flushQueuedMessagesIfReady(reason)
        return true
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
        val hasPlayer = _unityPlayer != null
        val hasActivity = UnityPlayer.currentActivity != null
        val appActive = _isAppActive

        if (!hasPlayer) {
            return true
        }

        if (hasActivity) {
            return true
        }

        val elapsedSinceResumeMs = SystemClock.elapsedRealtime() - _lastResumeAtMillis

        if (!appActive) {
            Log.w(
                TAG,
                "validateState transient: hasPlayer=true, hasActivity=false, isAppActive=false"
            )
            return true
        }

        if (elapsedSinceResumeMs <= ACTIVITY_RECOVERY_GRACE_MS) {
            Log.w(
                TAG,
                "validateState transient within grace: hasPlayer=true, hasActivity=false, elapsedSinceResumeMs=$elapsedSinceResumeMs"
            )
            return true
        }

        Log.w(
            TAG,
            "validateState retrying activity check: hasPlayer=true, hasActivity=false, isAppActive=true"
        )

        try {
            Thread.sleep(ACTIVITY_RECHECK_DELAY_MS)
        } catch (e: InterruptedException) {
            Thread.currentThread().interrupt()
            Log.w(TAG, "validateState retry interrupted: ${e.message}", e)
        }

        val hasActivityAfterRetry = UnityPlayer.currentActivity != null
        val stillStale = _unityPlayer != null && _isAppActive && !hasActivityAfterRetry

        if (stillStale) {
            Log.w(
                TAG,
                "⚠️ Stale state detected after retry: hasPlayer=true, hasActivity=false, isAppActive=true"
            )
        } else {
            Log.d(
                TAG,
                "validateState recovered after retry: hasActivityAfterRetry=$hasActivityAfterRetry"
            )
        }

        return !stillStale
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
        val recoveredImmediately = recoverReadyStateIfPossible("forceReset-immediate")
        if (!recoveredImmediately) {
            mainHandler.postDelayed({
                val recoveredDelayed = recoverReadyStateIfPossible("forceReset-delayed")
                Log.d(TAG, "forceReset delayed recovery result=$recoveredDelayed")
            }, ACTIVITY_RECHECK_DELAY_MS)
        }

        // Note: _unityPlayer는 null로 설정하지 않음 (재생성 필요시 getOrCreateUnityPlayer 호출)
        Log.d(TAG, "✅ Force reset completed (recoveredImmediately=$recoveredImmediately)")
    }

    // MARK: - Lifecycle Management

    /**
     * 앱이 Pause 상태로 전환될 때 호출
     * Unity Player의 onPause()를 호출하여 렌더링을 중지함
     */
    fun onPause() {
        Log.d(TAG, "onPause()")
        _isAppActive = false

        val player = _unityPlayer
        if (player != null) {
            try {
                player.windowFocusChanged(false)
            } catch (e: Exception) {
                Log.w(TAG, "windowFocusChanged(false) failed: ${e.message}", e)
            }

            try {
                player.onPause()  // Unity 렌더링 중지
            } catch (e: Exception) {
                Log.w(TAG, "onPause failed: ${e.message}", e)
            }
        }
    }

    /**
     * 앱이 Resume 상태로 전환될 때 호출
     * Unity Player의 onResume()을 호출하여 렌더링을 재개함
     */
    fun onResume() {
        Log.d(TAG, "onResume()")
        _isAppActive = true
        _lastResumeAtMillis = SystemClock.elapsedRealtime()

        val player = _unityPlayer
        if (player != null) {
            try {
                player.onResume()  // Unity 렌더링 재개
            } catch (e: Exception) {
                Log.w(TAG, "onResume failed: ${e.message}", e)
            }

            try {
                player.windowFocusChanged(true)
            } catch (e: Exception) {
                Log.w(TAG, "windowFocusChanged(true) failed: ${e.message}", e)
            }
        }

        val recoveredOnResume = recoverReadyStateIfPossible("onResume")
        if (!recoveredOnResume) {
            flushQueuedMessagesIfReady("onResume-existing-ready")
            mainHandler.postDelayed({
                recoverReadyStateIfPossible("onResume-delayed")
                flushQueuedMessagesIfReady("onResume-delayed")
            }, ACTIVITY_RECHECK_DELAY_MS)
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
