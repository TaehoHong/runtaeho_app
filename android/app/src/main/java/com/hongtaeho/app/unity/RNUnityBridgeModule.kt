package com.hongtaeho.app.unity

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject
import java.lang.ref.WeakReference
import java.text.SimpleDateFormat
import java.util.*

/**
 * React Native Unity Bridge Module
 * React Native와 Unity 간의 통신을 담당하는 네이티브 모듈
 * iOS의 RNUnityBridge.swift와 동일한 기능 제공
 *
 * Architecture: Push + Pull Pattern
 * - Push: 이벤트 발생 시 즉시 알림 (리스너 있을 때)
 * - Pull: 언제든 현재 상태 조회 가능
 * - Buffer: 리스너 없을 때 이벤트 보관 후 나중에 발송
 */
class RNUnityBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    LifecycleEventListener {

    companion object {
        private const val TAG = "RNUnityBridge"
        const val MODULE_NAME = "RNUnityBridge"

        // Event names
        private const val EVENT_ON_UNITY_ERROR = "onUnityError"
        private const val EVENT_ON_CHARACTOR_READY = "onCharactorReady"
        private const val EVENT_ON_AVATAR_READY = "onAvatarReady"

        // Timeout constants
        private const val AVATAR_TIMEOUT_MS: Long = 5000
        private const val CAPTURE_TIMEOUT_MS: Long = 5000

        // 싱글톤 참조 (콜백에서 접근 가능하도록)
        @Volatile
        private var instance: WeakReference<RNUnityBridgeModule>? = null

        /**
         * 현재 인스턴스 가져오기
         * UnityNativeBridge에서 콜백 처리 시 사용
         */
        fun getInstance(): RNUnityBridgeModule? = instance?.get()
    }

    // MARK: - State

    /** 리스너 등록 여부 */
    @Volatile
    private var hasListeners: Boolean = false

    /** 리스너 등록 전 대기 중인 이벤트들 */
    private val pendingEvents = mutableListOf<WritableMap>()

    /** 동기화 락 */
    private val eventsLock = Any()

    // MARK: - Promise-based Avatar Change

    /** 아바타 변경 대기 중인 Promise */
    @Volatile
    private var pendingAvatarResolve: Promise? = null

    /** 아바타 타임아웃 핸들러 */
    private var avatarTimeoutHandler: Handler? = null

    /** 아바타 Promise 락 */
    private val avatarLock = Any()

    // MARK: - Promise-based Character Capture

    /** 캐릭터 캡처 대기 중인 콜백들 (callbackId -> Promise) */
    private val pendingCaptureCallbacks = mutableMapOf<String, Promise>()

    /** 캡처 콜백 락 */
    private val captureLock = Any()

    /** Main Thread Handler */
    private val mainHandler = Handler(Looper.getMainLooper())

    init {
        // 싱글톤 인스턴스 설정
        instance = WeakReference(this)

        // Lifecycle 리스너 등록
        reactContext.addLifecycleEventListener(this)

        // UnityHolder에 콜백 리스너 등록
        UnityHolder.onCharactorReadyListener = {
            handleCharactorReady()
        }

        // UnityHolder에 Avatar Ready 콜백 리스너 등록
        UnityHolder.onAvatarReadyListener = {
            handleAvatarReadyCallback()
        }

        Log.d(TAG, "RNUnityBridgeModule initialized")
    }

    override fun getName(): String = MODULE_NAME

    // MARK: - React Native Event Emitter

    /**
     * 지원하는 이벤트 목록 반환
     * RCTEventEmitter 패턴에 필요
     */
    private fun getSupportedEvents(): List<String> {
        return listOf(EVENT_ON_UNITY_ERROR, EVENT_ON_CHARACTOR_READY, EVENT_ON_AVATAR_READY)
    }

    /**
     * 리스너 등록 시 호출됨 (JS에서 addListener 호출 시)
     * iOS의 startObserving()과 동일
     */
    @ReactMethod
    fun addListener(eventName: String) {
        Log.d(TAG, "addListener: $eventName")

        if (!hasListeners) {
            hasListeners = true
            Log.d(TAG, "Listeners started, pending events: ${pendingEvents.size}")

            // 대기 중인 이벤트 발송
            flushPendingEvents()
        }
    }

    /**
     * 리스너 해제 시 호출됨 (JS에서 removeListeners 호출 시)
     * iOS의 stopObserving()과 동일
     */
    @ReactMethod
    fun removeListeners(count: Int) {
        Log.d(TAG, "removeListeners: $count")

        // 모든 리스너가 제거되면 hasListeners를 false로 설정
        if (count == 0) {
            hasListeners = false
            Log.d(TAG, "Listeners stopped")
        }
    }

    // MARK: - Event Handling

    /**
     * Charactor Ready 이벤트 처리
     * UnityHolder에서 콜백으로 호출됨
     */
    private fun handleCharactorReady() {
        Log.d(TAG, "handleCharactorReady() called")

        val eventBody = Arguments.createMap().apply {
            putBoolean("ready", true)
            putString("timestamp", getISO8601Timestamp())
        }

        synchronized(eventsLock) {
            if (hasListeners) {
                Log.d(TAG, "Sending onCharactorReady event immediately")
                sendEvent(EVENT_ON_CHARACTOR_READY, eventBody)
            } else {
                Log.d(TAG, "Buffering onCharactorReady event (no listeners)")
                pendingEvents.add(eventBody)
            }
        }
    }

    /**
     * Avatar Ready 이벤트 처리 (이벤트 방식)
     * UnityHolder에서 콜백으로 호출됨
     */
    private fun handleAvatarReady() {
        Log.d(TAG, "handleAvatarReady() called")

        val eventBody = Arguments.createMap().apply {
            putBoolean("ready", true)
            putString("timestamp", getISO8601Timestamp())
        }

        synchronized(eventsLock) {
            if (hasListeners) {
                Log.d(TAG, "Sending onAvatarReady event immediately")
                sendEvent(EVENT_ON_AVATAR_READY, eventBody)
            } else {
                Log.d(TAG, "No listeners for onAvatarReady")
            }
        }
    }

    /**
     * Avatar Ready 콜백 처리 (Promise 방식)
     * changeAvatarAndWait의 Promise를 resolve함
     */
    private fun handleAvatarReadyCallback() {
        Log.d(TAG, "handleAvatarReadyCallback() called")

        // 이벤트 방식도 함께 호출
        handleAvatarReady()

        // Promise 방식 처리
        synchronized(avatarLock) {
            avatarTimeoutHandler?.removeCallbacksAndMessages(null)
            avatarTimeoutHandler = null

            pendingAvatarResolve?.let { promise ->
                Log.d(TAG, "Resolving pending avatar promise with true")
                promise.resolve(true)
            }
            pendingAvatarResolve = null
        }
    }

    /**
     * 캐릭터 이미지 캡처 완료 콜백
     * Unity에서 캡처 완료 시 UnityNativeBridge를 통해 호출됨
     *
     * @param callbackId 요청 시 전달한 콜백 ID
     * @param base64Image Base64 인코딩된 이미지 데이터
     */
    fun handleCharacterImageCaptured(callbackId: String, base64Image: String) {
        Log.d(TAG, "handleCharacterImageCaptured() called with callbackId: $callbackId")

        synchronized(captureLock) {
            val promise = pendingCaptureCallbacks.remove(callbackId)
            if (promise != null) {
                Log.d(TAG, "Resolving capture promise for callbackId: $callbackId")
                promise.resolve(base64Image)
            } else {
                Log.w(TAG, "No pending capture callback found for callbackId: $callbackId")
            }
        }
    }

    /**
     * 대기 중인 이벤트 발송
     */
    private fun flushPendingEvents() {
        synchronized(eventsLock) {
            if (pendingEvents.isEmpty()) return

            Log.d(TAG, "Flushing ${pendingEvents.size} pending events")

            pendingEvents.forEach { event ->
                Log.d(TAG, "Flushing buffered event")
                sendEvent(EVENT_ON_CHARACTOR_READY, event)
            }

            pendingEvents.clear()
        }
    }

    // MARK: - State Query (Pull Pattern)

    /**
     * Charactor Ready 상태 조회
     * iOS의 isCharactorReady와 동일
     *
     * @param promise React Native Promise
     */
    @ReactMethod
    fun isCharactorReady(promise: Promise) {
        val isReady = UnityHolder.isCharactorReady
        Log.d(TAG, "isCharactorReady: $isReady")
        promise.resolve(isReady)
    }

    /**
     * Ready 상태 리셋
     * iOS의 resetCharactorReady와 동일
     *
     * @param promise React Native Promise
     */
    @ReactMethod
    fun resetCharactorReady(promise: Promise) {
        Log.d(TAG, "resetCharactorReady()")

        try {
            // 상태 리셋
            UnityHolder.resetCharactorReady()

            // 대기 중인 이벤트 클리어
            synchronized(eventsLock) {
                pendingEvents.clear()
            }

            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error resetting charactor ready: ${e.message}", e)
            promise.reject("RESET_ERROR", "Failed to reset charactor ready state", e)
        }
    }

    // MARK: - Unity State Validation

    /**
     * Unity 상태 유효성 검사
     * iOS의 validateUnityState와 동일
     * 앱 업데이트 후 stale 상태 감지에 사용
     *
     * @param promise React Native Promise (Boolean 반환)
     */
    @ReactMethod
    fun validateUnityState(promise: Promise) {
        val isValid = UnityHolder.validateState()
        Log.d(TAG, "validateUnityState: $isValid")
        promise.resolve(isValid)
    }

    /**
     * Unity 강제 리셋 (stale 상태 복구용)
     * iOS의 forceResetUnity와 동일
     *
     * @param promise React Native Promise
     */
    @ReactMethod
    fun forceResetUnity(promise: Promise) {
        Log.d(TAG, "🔄 Force reset requested")
        try {
            UnityHolder.forceReset()

            // Bridge 상태도 리셋
            synchronized(eventsLock) {
                pendingEvents.clear()
            }

            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Force reset failed: ${e.message}", e)
            promise.reject("RESET_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCaptureRootBounds(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("CAPTURE_ROOT_ERROR", "Current activity is null")
            return
        }

        activity.runOnUiThread {
            try {
                val contentRoot = activity.findViewById<View>(android.R.id.content)
                if (contentRoot == null) {
                    promise.reject("CAPTURE_ROOT_ERROR", "Android content root is not available")
                    return@runOnUiThread
                }

                val width = contentRoot.width
                val height = contentRoot.height
                if (width <= 0 || height <= 0) {
                    promise.reject(
                        "CAPTURE_ROOT_ERROR",
                        "Android content root bounds are invalid: ${width}x${height}"
                    )
                    return@runOnUiThread
                }

                val location = IntArray(2)
                contentRoot.getLocationInWindow(location)

                val result = Arguments.createMap().apply {
                    putDouble("x", location[0].toDouble())
                    putDouble("y", location[1].toDouble())
                    putDouble("width", width.toDouble())
                    putDouble("height", height.toDouble())
                }

                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "getCaptureRootBounds error: ${e.message}", e)
                promise.reject("CAPTURE_ROOT_ERROR", "Failed to resolve Android content root bounds", e)
            }
        }
    }

    // MARK: - Promise-based Avatar Change Method

    /**
     * 아바타 변경 후 완료를 기다리는 메서드
     * iOS의 changeAvatarAndWait와 동일한 기능
     *
     * @param objectName Unity GameObject 이름
     * @param methodName Unity에서 호출할 메서드 이름
     * @param data 전달할 데이터 (문자열)
     * @param promise React Native Promise (Boolean 반환 - true: 성공, false: 타임아웃)
     */
    @ReactMethod
    fun changeAvatarAndWait(
        objectName: String,
        methodName: String,
        data: String,
        promise: Promise
    ) {
        Log.d(TAG, "changeAvatarAndWait: $objectName.$methodName($data)")

        synchronized(avatarLock) {
            // 이전 pending promise 정리 (새 요청이 들어오면 이전 요청은 취소)
            pendingAvatarResolve?.reject("CANCELLED", "New avatar change request", null)
            avatarTimeoutHandler?.removeCallbacksAndMessages(null)

            // 새 promise 설정
            pendingAvatarResolve = promise

            // 타임아웃 설정
            avatarTimeoutHandler = Handler(Looper.getMainLooper())
            avatarTimeoutHandler?.postDelayed({
                synchronized(avatarLock) {
                    if (pendingAvatarResolve === promise) {
                        Log.w(TAG, "Avatar change timed out after ${AVATAR_TIMEOUT_MS}ms")
                        pendingAvatarResolve?.resolve(false)
                        pendingAvatarResolve = null
                        avatarTimeoutHandler = null
                    }
                }
            }, AVATAR_TIMEOUT_MS)
        }

        // Unity 메시지 전송
        try {
            UnityHolder.sendMessage(objectName, methodName, data)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send avatar change message: ${e.message}", e)
            synchronized(avatarLock) {
                avatarTimeoutHandler?.removeCallbacksAndMessages(null)
                avatarTimeoutHandler = null
                pendingAvatarResolve?.reject("UNITY_MESSAGE_ERROR", "Failed to send message: ${e.message}", e)
                pendingAvatarResolve = null
            }
        }
    }

    // MARK: - Promise-based Character Capture Method

    /**
     * Unity 캐릭터 캡처 메서드
     * iOS의 captureCharacter와 동일한 기능
     *
     * @param promise React Native Promise (String 반환 - Base64 이미지 또는 에러)
     */
    @ReactMethod
    fun captureCharacter(promise: Promise) {
        Log.d(TAG, "captureCharacter() called")

        val callbackId = UUID.randomUUID().toString()

        synchronized(captureLock) {
            pendingCaptureCallbacks[callbackId] = promise
        }

        // Unity에 캡처 요청 전송
        try {
            UnityHolder.sendMessage("Charactor", "CaptureCharacter", callbackId)

            // 타임아웃 설정
            mainHandler.postDelayed({
                synchronized(captureLock) {
                    val pendingPromise = pendingCaptureCallbacks.remove(callbackId)
                    if (pendingPromise != null) {
                        Log.w(TAG, "Character capture timed out for callbackId: $callbackId")
                        pendingPromise.reject("TIMEOUT", "Character capture timed out", null)
                    }
                }
            }, CAPTURE_TIMEOUT_MS)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send capture request: ${e.message}", e)
            synchronized(captureLock) {
                pendingCaptureCallbacks.remove(callbackId)
            }
            promise.reject("CAPTURE_ERROR", "Failed to request capture: ${e.message}", e)
        }
    }

    // MARK: - Unity Message Methods

    /**
     * Unity에 일반 메시지 전송 (순수 브리지)
     * iOS의 sendUnityMessage와 동일한 기능
     *
     * @param objectName Unity GameObject 이름
     * @param methodName Unity에서 호출할 메서드 이름
     * @param parameter 전달할 파라미터 (문자열)
     * @param promise React Native Promise
     */
    @ReactMethod
    fun sendUnityMessage(
        objectName: String,
        methodName: String,
        parameter: String,
        promise: Promise
    ) {
        Log.d(TAG, "sendUnityMessage: $objectName.$methodName($parameter)")

        try {
            UnityHolder.sendMessage(objectName, methodName, parameter)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send Unity message: ${e.message}", e)
            promise.reject("UNITY_MESSAGE_ERROR", "Failed to send Unity message: ${e.message}", e)

            // 에러 이벤트 전송
            sendErrorEvent("UNITY_MESSAGE_ERROR", "Failed to send Unity message", e.message ?: "Unknown error")
        }
    }

    /**
     * Unity에 JSON 데이터 전송 (배열/딕셔너리용)
     * iOS의 sendUnityJSON과 동일한 기능
     *
     * @param objectName Unity GameObject 이름
     * @param methodName Unity에서 호출할 메서드 이름
     * @param data 전달할 데이터 (ReadableArray)
     * @param promise React Native Promise
     */
    @ReactMethod
    fun sendUnityJSON(
        objectName: String,
        methodName: String,
        data: ReadableArray,
        promise: Promise
    ) {
        Log.d(TAG, "sendUnityJSON: $objectName.$methodName with ${data.size()} items")

        try {
            // ReadableArray를 JSON 문자열로 변환
            val jsonArray = convertReadableArrayToJsonArray(data)
            val jsonString = jsonArray.toString()

            Log.d(TAG, "JSON string: $jsonString")

            // Unity로 전송
            UnityHolder.sendMessage(objectName, methodName, jsonString)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send Unity JSON: ${e.message}", e)
            promise.reject("JSON_CONVERSION_ERROR", "Failed to convert data to JSON: ${e.message}", e)

            // 에러 이벤트 전송
            sendErrorEvent("JSON_CONVERSION_ERROR", "Failed to convert data to JSON", e.message ?: "Unknown error")
        }
    }

    // MARK: - Lifecycle Event Listener

    override fun onHostResume() {
        Log.d(TAG, "onHostResume()")
        UnityHolder.onResume()
    }

    override fun onHostPause() {
        Log.d(TAG, "onHostPause()")
        UnityHolder.onPause()
    }

    override fun onHostDestroy() {
        Log.d(TAG, "onHostDestroy()")

        // 리스너 정리
        UnityHolder.onCharactorReadyListener = null
        UnityHolder.onAvatarReadyListener = null

        // Promise 관련 리소스 정리
        synchronized(avatarLock) {
            avatarTimeoutHandler?.removeCallbacksAndMessages(null)
            avatarTimeoutHandler = null
            pendingAvatarResolve = null
        }

        synchronized(captureLock) {
            pendingCaptureCallbacks.clear()
        }

        // 싱글톤 인스턴스 정리
        instance = null
    }

    // MARK: - Shared Editor Methods (공유 에디터 메서드들)

    /**
     * Unity 캐릭터 표시/숨김 설정 (공유 에디터용)
     */
    @ReactMethod
    fun setCharacterVisible(visible: Boolean, promise: Promise) {
        Log.d(TAG, "setCharacterVisible: $visible")

        try {
            UnityHolder.sendMessage(
                "Charactor",
                "SetCharacterVisible",
                if (visible) "true" else "false"
            )
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setCharacterVisible error: ${e.message}", e)
            promise.reject("SET_CHARACTER_VISIBLE_ERROR", "Failed to set character visible", e)
        }
    }

    /**
     * 배경 설정 (배경 ID 기반)
     * iOS의 setBackground와 동일한 기능
     *
     * @param backgroundId 배경 ID
     * @param promise React Native Promise
     */
    @ReactMethod
    fun setBackground(backgroundId: String, promise: Promise) {
        Log.d(TAG, "setBackground: $backgroundId")

        try {
            UnityHolder.sendMessage("Background", "SetBackground", backgroundId)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setBackground error: ${e.message}", e)
            promise.reject("SET_BACKGROUND_ERROR", "Failed to set background", e)
        }
    }

    /**
     * 배경색 설정
     * iOS의 setBackgroundColor와 동일한 기능
     *
     * @param hexColor HEX 색상 코드 (예: "#FF0000")
     * @param promise React Native Promise
     */
    @ReactMethod
    fun setBackgroundColor(hexColor: String, promise: Promise) {
        Log.d(TAG, "setBackgroundColor: $hexColor")

        try {
            UnityHolder.sendMessage("Background", "SetBackgroundColor", hexColor)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setBackgroundColor error: ${e.message}", e)
            promise.reject("SET_BACKGROUND_COLOR_ERROR", "Failed to set background color", e)
        }
    }

    /**
     * 사진으로 배경 설정
     * iOS의 setBackgroundFromPhoto와 동일한 기능
     *
     * @param base64Image Base64 인코딩된 이미지 데이터
     * @param promise React Native Promise
     */
    @ReactMethod
    fun setBackgroundFromPhoto(base64Image: String, promise: Promise) {
        Log.d(TAG, "setBackgroundFromPhoto: (base64 image length: ${base64Image.length})")

        try {
            UnityHolder.sendMessage("Background", "SetBackgroundFromBase64", base64Image)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setBackgroundFromPhoto error: ${e.message}", e)
            promise.reject("SET_BACKGROUND_FROM_PHOTO_ERROR", "Failed to set background from photo", e)
        }
    }

    /**
     * 캐릭터 위치 설정
     * iOS의 setCharacterPosition과 동일한 기능
     *
     * @param x X 좌표
     * @param y Y 좌표
     * @param promise React Native Promise
     */
    @ReactMethod
    fun setCharacterPosition(x: Double, y: Double, promise: Promise) {
        Log.d(TAG, "setCharacterPosition: ($x, $y)")

        try {
            val json = """{"x":$x,"y":$y}"""
            UnityHolder.sendMessage("Charactor", "SetCharacterPosition", json)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setCharacterPosition error: ${e.message}", e)
            promise.reject("SET_CHARACTER_POSITION_ERROR", "Failed to set character position", e)
        }
    }

    /**
     * 캐릭터 스케일 설정
     * iOS의 setCharacterScale과 동일한 기능
     *
     * @param scale 스케일 값
     * @param promise React Native Promise
     */
    @ReactMethod
    fun setCharacterScale(scale: Double, promise: Promise) {
        Log.d(TAG, "setCharacterScale: $scale")

        try {
            UnityHolder.sendMessage("Charactor", "SetCharacterScale", scale.toString())
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setCharacterScale error: ${e.message}", e)
            promise.reject("SET_CHARACTER_SCALE_ERROR", "Failed to set character scale", e)
        }
    }

    // MARK: - Unity Engine Methods (Unity 엔진 메서드들)

    /**
     * Unity 엔진 준비 상태 확인
     * iOS의 isEngineReady와 동일한 기능
     *
     * @param promise React Native Promise (Boolean 반환)
     */
    @ReactMethod
    fun isEngineReady(promise: Promise) {
        val isReady = UnityHolder.isUnityReady
        Log.d(TAG, "isEngineReady: $isReady")
        promise.resolve(isReady)
    }

    /**
     * Unity 엔진 초기화
     * iOS의 initializeUnityEngine과 동일한 기능
     *
     * @param promise React Native Promise
     */
    @ReactMethod
    fun initializeUnityEngine(promise: Promise) {
        Log.d(TAG, "initializeUnityEngine() called")

        try {
            UnityHolder.initialize()
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "initializeUnityEngine error: ${e.message}", e)
            promise.reject("INITIALIZE_UNITY_ERROR", "Failed to initialize Unity engine", e)
        }
    }

    // MARK: - Helper Methods

    /**
     * ReadableArray를 JSONArray로 변환
     */
    private fun convertReadableArrayToJsonArray(readableArray: ReadableArray): JSONArray {
        val jsonArray = JSONArray()

        for (i in 0 until readableArray.size()) {
            when (readableArray.getType(i)) {
                ReadableType.Null -> jsonArray.put(JSONObject.NULL)
                ReadableType.Boolean -> jsonArray.put(readableArray.getBoolean(i))
                ReadableType.Number -> jsonArray.put(readableArray.getDouble(i))
                ReadableType.String -> jsonArray.put(readableArray.getString(i))
                ReadableType.Map -> {
                    val map = readableArray.getMap(i)
                    if (map != null) {
                        jsonArray.put(convertReadableMapToJsonObject(map))
                    }
                }
                ReadableType.Array -> {
                    val array = readableArray.getArray(i)
                    if (array != null) {
                        jsonArray.put(convertReadableArrayToJsonArray(array))
                    }
                }
            }
        }

        return jsonArray
    }

    /**
     * ReadableMap을 org.json.JSONObject로 변환
     */
    private fun convertReadableMapToJsonObject(readableMap: ReadableMap): org.json.JSONObject {
        val jsonObject = org.json.JSONObject()
        val iterator = readableMap.keySetIterator()

        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (readableMap.getType(key)) {
                ReadableType.Null -> jsonObject.put(key, org.json.JSONObject.NULL)
                ReadableType.Boolean -> jsonObject.put(key, readableMap.getBoolean(key))
                ReadableType.Number -> jsonObject.put(key, readableMap.getDouble(key))
                ReadableType.String -> jsonObject.put(key, readableMap.getString(key))
                ReadableType.Map -> {
                    val map = readableMap.getMap(key)
                    if (map != null) {
                        jsonObject.put(key, convertReadableMapToJsonObject(map))
                    }
                }
                ReadableType.Array -> {
                    val array = readableMap.getArray(key)
                    if (array != null) {
                        jsonObject.put(key, convertReadableArrayToJsonArray(array))
                    }
                }
            }
        }

        return jsonObject
    }

    /**
     * React Native로 이벤트 전송
     */
    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * 에러 이벤트 전송
     */
    private fun sendErrorEvent(type: String, message: String, error: String) {
        val params = Arguments.createMap().apply {
            putString("type", type)
            putString("message", message)
            putString("error", error)
        }
        sendEvent(EVENT_ON_UNITY_ERROR, params)
    }

    /**
     * ISO 8601 형식의 현재 시간 문자열 반환
     */
    private fun getISO8601Timestamp(): String {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        dateFormat.timeZone = TimeZone.getTimeZone("UTC")
        return dateFormat.format(Date())
    }
}
