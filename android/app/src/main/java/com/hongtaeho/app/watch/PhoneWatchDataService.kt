package com.hongtaeho.app.watch

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.*
import com.runtaeho.watchsync.WatchRecords
import com.runtaeho.watchsync.WatchStore
import com.runtaeho.watchsync.WatchTransport

class PhoneWatchDataService : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        val items = events.filter { it.type == DataEvent.TYPE_CHANGED }.map { it.dataItem.freeze() }
        WatchTransport.executor.execute {
            items.forEach { item -> receive(applicationContext, item) }
            publish(applicationContext)
            wakePending(applicationContext)
        }
    }
    override fun onPeerConnected(peer: Node) { retry(applicationContext, true) }
    override fun onCapabilityChanged(info: CapabilityInfo) { retry(applicationContext, true) }
    companion object {
        fun retry(context: Context, externalWake: Boolean = false) {
            WatchTransport.executor.execute {
                try { WatchTransport.scan(context) { receive(context, it) } }
                catch (_: Exception) { Log.w("WatchSync", "Data Layer scan deferred") }
                publish(context)
                if (externalWake) WatchUploadScheduler.signalOnWorker(context)
                wakePending(context)
            }
        }
        fun publishPending(context: Context) {
            WatchTransport.executor.execute { publish(context); WatchUploadScheduler.ensureOnWorker(context) }
        }
        private fun receive(context: Context, item: DataItem) {
            if (!item.uri.path.orEmpty().startsWith(WatchTransport.ROOT + "/record/")) return
            try {
                val record = WatchTransport.read(context, item) ?: return
                if (!WatchRecords.validRecord(record) || item.uri.lastPathSegment != record.getString("sessionId")) return
                val id = record.getString("sessionId")
                val store = WatchStore(context)
                val ack = store.read("ack-$id")
                if (ack != null && WatchRecords.sameRecord(record, ack)) return
                // First received immutable payload wins; retry never changes ownership/data.
                if (store.retainIncoming(record)) WatchUploadScheduler.signalOnWorker(context)
            } catch (_: Exception) { Log.w("WatchSync", "Watch inbox receive failed; DataItem retained") }
        }
        private fun wakePending(context: Context) {
            try {
                if (WatchStore(context).entries("inbox-").isEmpty()) { WatchUploadScheduler.ensureOnWorker(context); return }
                RNWatchSyncBridgeModule.notifyPending()
                WatchUploadScheduler.ensureOnWorker(context)
            } catch (_: Exception) { Log.w("WatchSync", "Watch upload wake deferred") }
        }
        private fun publish(context: Context) {
            try {
                val store = WatchStore(context)
                store.read("owner")?.let { WatchTransport.put(context, "/owner", it) }
                store.entries("ack-").forEach { WatchTransport.put(context, "/ack/" + it.getString("sessionId"), it) }
            } catch (_: Exception) { Log.w("WatchSync", "Data Layer publication deferred") }
        }
    }
}
