package com.hongtaeho.app.watch

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.runtaeho.watchsync.WatchRecords
import com.runtaeho.watchsync.WatchStore
import com.runtaeho.watchsync.WatchTransport
import org.json.JSONObject
import java.lang.ref.WeakReference

class RNWatchSyncBridgeModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "RNWatchSyncBridge"
    override fun initialize() {
        super.initialize()
        active = WeakReference(context)
        PhoneWatchDataService.retry(context)
    }
    override fun invalidate() { active = null; super.invalidate() }

    @ReactMethod fun setOwnerUserId(userId: String?, promise: Promise) = work(promise) {
        require(userId == null || userId.toLongOrNull()?.let { it > 0 } == true) { "Invalid owner" }
        val owner = JSONObject().put("ownerUserId", userId ?: JSONObject.NULL)
        WatchStore(context).write("owner", owner)
        // Publish is retryable; the private owner is retained even with no paired watch.
        PhoneWatchDataService.retry(context)
        null
    }
    @ReactMethod fun getPendingRecords(promise: Promise) = work(promise) {
        val result = Arguments.createArray()
        WatchStore(context).entries("inbox-").forEach { result.pushMap(Arguments.makeNativeMap(jsonMap(it))) }
        result
    }
    @ReactMethod fun acknowledgeRecord(sessionId: String, source: String, ownerUserId: String,
                                       runningRecordId: String, promise: Promise) = work(promise) {
        val store = WatchStore(context)
        require(sessionId.matches(Regex("[0-9a-f-]{36}"))) { "Invalid session" }
        val record = store.read("inbox-$sessionId")
        val ack = JSONObject().put("sessionId", sessionId).put("source", source)
            .put("ownerUserId", ownerUserId).put("runningRecordId", runningRecordId)
        require(record == null || WatchRecords.sameRecord(record, ack)) { "Acknowledgement mismatch" }
        require(source == "WEAR_OS" && ownerUserId.toLongOrNull()?.let { it > 0 } == true &&
            runningRecordId.toLongOrNull()?.let { it > 0 } == true) { "Invalid acknowledgement" }
        if (record != null) {
            store.acknowledgeIncoming(ack)
        }
        PhoneWatchDataService.retry(context)
        null
    }
    @ReactMethod fun addListener(eventName: String) { }
    @ReactMethod fun removeListeners(count: Int) { }

    private fun work(promise: Promise, block: () -> Any?) {
        WatchTransport.executor.execute {
            try { promise.resolve(block()) }
            catch (_: Exception) { promise.reject("WATCH_SYNC_STORAGE", "Watch sync operation failed") }
        }
    }
    companion object {
        private var active: WeakReference<ReactApplicationContext>? = null
        fun notifyPending() {
            active?.get()?.let { context ->
                if (context.hasActiveReactInstance()) context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("watchSyncPendingRecords", null)
            }
        }
        private fun jsonMap(value: JSONObject): Map<String, Any?> = value.keys().asSequence().associateWith { key ->
            when (val item = value.get(key)) {
                JSONObject.NULL -> null
                is JSONObject -> jsonMap(item)
                is org.json.JSONArray -> (0 until item.length()).map { index ->
                    val nested = item.get(index)
                    if (nested is JSONObject) jsonMap(nested) else nested
                }
                else -> item
            }
        }
    }
}
