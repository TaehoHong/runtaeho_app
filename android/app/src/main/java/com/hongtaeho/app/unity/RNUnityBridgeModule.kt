package com.hongtaeho.app.unity

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject

/**
 * React Native Unity Bridge Module
 * React Native와 Unity 간의 통신을 담당하는 네이티브 모듈
 * iOS의 RNUnityBridge.swift와 동일한 기능 제공
 */
class RNUnityBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "RNUnityBridge"
        const val MODULE_NAME = "RNUnityBridge"
    }

    override fun getName(): String = MODULE_NAME

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
        sendEvent("onUnityError", params)
    }
}
