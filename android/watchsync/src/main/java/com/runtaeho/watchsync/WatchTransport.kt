package com.runtaeho.watchsync

import android.content.Context
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.*
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

object WatchTransport {
    const val ROOT = "/runtaeho/watch/v1"
    val executor = Executors.newSingleThreadExecutor()

    fun put(context: Context, path: String, value: JSONObject, asset: Boolean = false) {
        val request = PutDataMapRequest.create(ROOT + path)
        if (asset) request.dataMap.putAsset("record", Asset.createFromBytes(value.toString().toByteArray()))
        else request.dataMap.putString("json", value.toString())
        Tasks.await(Wearable.getDataClient(context).putDataItem(request.asPutDataRequest().setUrgent()), 30, TimeUnit.SECONDS)
    }

    fun read(context: Context, item: DataItem): JSONObject? {
        val map = DataMapItem.fromDataItem(item).dataMap
        val asset = map.getAsset("record")
        return if (asset != null) {
            val response = Tasks.await(Wearable.getDataClient(context).getFdForAsset(asset), 30, TimeUnit.SECONDS)
            response.inputStream.use { stream ->
                // A bounded asset protects the phone from accidental unbounded input.
                val bytes = stream.readBytesBounded(32 * 1024 * 1024)
                JSONObject(String(bytes, Charsets.UTF_8))
            }
        } else map.getString("json")?.let(::JSONObject)
    }

    private fun java.io.InputStream.readBytesBounded(limit: Int): ByteArray {
        val output = java.io.ByteArrayOutputStream()
        val buffer = ByteArray(8192)
        while (true) {
            val count = read(buffer)
            if (count == -1) break
            require(output.size() + count <= limit) { "Watch record exceeds size limit" }
            output.write(buffer, 0, count)
        }
        return output.toByteArray()
    }

    fun scan(context: Context, consume: (DataItem) -> Unit) {
        Tasks.await(Wearable.getDataClient(context).dataItems, 30, TimeUnit.SECONDS).use { items ->
            items.forEach(consume)
        }
    }
}
