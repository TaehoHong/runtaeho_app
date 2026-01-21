package com.hongtaeho.app.unity

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject
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
    }

    // MARK: - State

    /** 리스너 등록 여부 */
    @Volatile
    private var hasListeners: Boolean = false

    /** 리스너 등록 전 대기 중인 이벤트들 */
    private val pendingEvents = mutableListOf<WritableMap>()

    /** 동기화 락 */
    private val eventsLock = Any()

    init {
        // Lifecycle 리스너 등록
        reactContext.addLifecycleEventListener(this)

        // UnityHolder에 콜백 리스너 등록
        UnityHolder.onCharactorReadyListener = {
            handleCharactorReady()
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
        return listOf(EVENT_ON_UNITY_ERROR, EVENT_ON_CHARACTOR_READY)
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
