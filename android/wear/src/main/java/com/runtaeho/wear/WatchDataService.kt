package com.runtaeho.wear

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.*
import com.runtaeho.watchsync.WatchRecords
import com.runtaeho.watchsync.WatchStore
import com.runtaeho.watchsync.WatchTransport

class WatchDataService : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        val items = events.filter { it.type == DataEvent.TYPE_CHANGED }.map { it.dataItem.freeze() }
        WatchTransport.executor.execute {
            items.forEach { receive(applicationContext, it) }
            publish(applicationContext)
        }
    }
    override fun onPeerConnected(peer: Node) { retry(applicationContext) }
    override fun onCapabilityChanged(info: CapabilityInfo) { retry(applicationContext) }
    companion object {
        fun retry(context: Context) {
            WatchTransport.executor.execute {
                try { WatchTransport.scan(context) { receive(context, it) } }
                catch (_: Exception) { Log.w("WatchSync", "Watch Data Layer scan deferred") }
                publish(context)
            }
        }
        private fun receive(context: Context, item: DataItem) {
            try {
                val path = item.uri.path.orEmpty()
                val store = WatchStore(context)
                if (path == WatchTransport.ROOT + "/owner") {
                    val owner = WatchTransport.read(context, item) ?: return
                    if (owner.isNull("ownerUserId") || owner.optString("ownerUserId").toLongOrNull()?.let { it > 0 } == true)
                        store.write("owner", owner)
                } else if (path.startsWith(WatchTransport.ROOT + "/ack/")) {
                    val ack = WatchTransport.read(context, item) ?: return
                    val id = ack.optString("sessionId")
                    if (!id.matches(Regex("[0-9a-f-]{36}")) || item.uri.lastPathSegment != id) return
                    val record = store.read("pending-$id") ?: store.read("receipt-$id") ?: return
                    if (WatchRecords.sameRecord(record, ack)) {
                        store.acknowledgePending(ack)
                        Wearable.getDataClient(context).deleteDataItems(android.net.Uri.parse("wear://*/" +
                            (WatchTransport.ROOT + "/record/$id").trimStart('/')), DataClient.FILTER_LITERAL)
                            .addOnFailureListener { Log.w("WatchSync", "Acknowledged DataItem cleanup deferred") }
                    }
                }
            } catch (_: Exception) { Log.w("WatchSync", "Watch receive deferred") }
        }
        private fun publish(context: Context) {
            try {
                WatchStore(context).entries("pending-").forEach {
                    WatchTransport.put(context, "/record/" + it.getString("sessionId"), it, true)
                }
            } catch (_: Exception) { Log.w("WatchSync", "Watch outbox retained for retry") }
        }
    }
}
