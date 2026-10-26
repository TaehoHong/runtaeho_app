package com.runtaeho.watchsync

import org.json.JSONObject
import java.util.UUID

object WatchRecords {
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
