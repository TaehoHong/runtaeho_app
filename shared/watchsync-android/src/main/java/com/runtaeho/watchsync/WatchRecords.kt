package com.runtaeho.watchsync

import org.json.JSONObject
import java.util.UUID

object WatchRecords {
    /** Snapshot measured deltas; older checkpoints without items remain summary-only. */
    fun captureInterval(record: JSONObject, force: Boolean) {
        val items = record.optJSONArray("items") ?: return
        if (!record.has("distance")) return
        val duration = record.getLong("durationMs") / 1000
        val seconds = duration - record.optLong("segmentDuration")
        val distance = record.getDouble("distance").toInt()
        val meters = distance - record.optInt("segmentDistance")
        if (meters < 0 || seconds < 0 || !force && seconds < 10) return
        val end = record.optLong("endTimestamp", record.getLong("lastMeasuredTime") / 1000)
        if (seconds == 0L) {
            if (items.length() == 0) return
            val last = items.getJSONObject(items.length() - 1)
            last.put("distance", last.getInt("distance") + meters).put("endTimestamp", end)
        } else {
            fun average(metric: String): Int {
                val count = record.optInt(metric + "Count") - record.optInt("segment" + metric + "Count")
                val sum = record.optDouble(metric + "Sum", 0.0) - record.optDouble("segment" + metric + "Sum", 0.0)
                return if (count > 0) kotlin.math.round(sum / count).toInt().coerceIn(0, 255) else 0
            }
            items.put(JSONObject().put("distance", meters).put("durationSec", seconds)
                .put("heartRate", average("heartRate")).put("cadence", average("cadence"))
                .put("minHeartRate", 0).put("maxHeartRate", 0).put("orderIndex", items.length())
                .put("startTimestamp", if (items.length() > 0) items.getJSONObject(items.length() - 1).getLong("endTimestamp") else record.getLong("startTimestamp"))
                .put("endTimestamp", end).put("gpsPoints", org.json.JSONArray()))
        }
        record.put("segmentDuration", duration).put("segmentDistance", distance)
        for (metric in listOf("heartRate", "cadence")) {
            record.put("segment" + metric + "Count", record.optInt(metric + "Count"))
                .put("segment" + metric + "Sum", record.optDouble(metric + "Sum", 0.0))
        }
    }

    fun validRecord(record: JSONObject): Boolean = try {
        integer(record, "schemaVersion", 1, 1) && record.getString("source") == "WEAR_OS" &&
            UUID.fromString(record.getString("sessionId")).toString() == record.getString("sessionId") &&
            integer(record, "ownerUserId", 1, 9007199254740991L) &&
            integer(record, "startTimestamp", 1, 9007199254740991L) &&
            integer(record, "endTimestamp", record.getLong("startTimestamp"), 9007199254740991L) &&
            integer(record, "durationSec", 0, Int.MAX_VALUE.toLong()) && integer(record, "distance", 0, Int.MAX_VALUE.toLong()) &&
            integer(record, "cadence", 0, 255) && integer(record, "heartRate", 0, 255) && integer(record, "calorie", 0, Int.MAX_VALUE.toLong()) &&
            record.getJSONArray("gpsPoints").length() <= 100000
    } catch (_: Exception) { false }

    /** Reject clock anomalies without rewriting measured times or route samples. */
    fun validTimeline(record: JSONObject): Boolean = try {
        val start = record.getLong("startTimestamp")
        val end = record.getLong("endTimestamp")
        val duration = record.getLong("durationSec")
        val route = record.getJSONArray("gpsPoints")
        var previous = start * 1000
        start in 0..253402300799L && end in start..253402300799L && duration in 0..(end - start) &&
            (0 until route.length()).all { index ->
                val timestamp = route.getJSONObject(index).getLong("timestampMs")
                val valid = timestamp >= previous && timestamp >= start * 1000 && timestamp <= end * 1000 + 999
                previous = timestamp
                valid
            }
    } catch (_: Exception) { false }

    private fun integer(value: JSONObject, key: String, min: Long, max: Long): Boolean {
        val number = value.get(key) as? Number ?: return false
        val double = number.toDouble()
        return double.isFinite() && double == number.toLong().toDouble() && number.toLong() in min..max
    }

    fun sameRecord(record: JSONObject, ack: JSONObject): Boolean =
        record.optString("sessionId") == ack.optString("sessionId") &&
            record.optString("ownerUserId") == ack.optString("ownerUserId") &&
            record.optString("source") == ack.optString("source") &&
            ack.optString("runningRecordId").toLongOrNull()?.let { it > 0 } == true
}
