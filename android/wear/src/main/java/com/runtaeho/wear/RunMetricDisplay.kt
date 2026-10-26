package com.runtaeho.wear

import org.json.JSONObject
import java.util.Locale

object RunMetricDisplay {
    data class Value(val number: String, val unit: String, val label: String)
    // Screen-off Health Services samples may be batched; never label stale data as live.
    private const val LIVE_MAX_AGE_MS = 30000L
    fun value(metric: String, record: JSONObject?, unit: String, now: Long): Value {
        val metersPerUnit = if (unit == "MPH") 1609.344 else 1000.0
        val distanceUnit = if (unit == "MPH") "mi" else "km"
        val paceUnit = "min/$distanceUnit"
        val distance = nonnegative(record, "distance")
        val duration = record?.takeIf { nonnegative(it, "durationMs") != null }?.let {
            ActiveTime.milliseconds(it.getLong("durationMs"), it.optLong("checkpointTime"), now,
                it.optString("state") == "ACTIVE") / 1000
        }
        val speed = live(record, "speed", "speedSampleEpochMs", "speedAvailable", now)
        val label = RunDisplayPreferences.labels[metric] ?: ""
        return when (metric) {
            "distance" -> Value(distance?.let { decimal(it / metersPerUnit, 2) } ?: "--", distanceUnit, label)
            "duration" -> Value(duration?.let(::time) ?: "--", "", label)
            "currentPace" -> Value(speed?.takeIf { it > 0 }?.let { pace(metersPerUnit / it) } ?: "--", paceUnit, label)
            "averagePace" -> Value(if (distance != null && distance > 0 && duration != null && duration > 0)
                pace(duration * metersPerUnit / distance) else "--", paceUnit, label)
            "speed" -> Value(speed?.let { (it * 3600 / metersPerUnit).takeIf { converted -> converted.isFinite() } }?.let { decimal(it, 1) } ?: "--", if (unit == "MPH") "mph" else "km/h", label)
            "heartRate" -> Value(live(record, "heartRateLatest", "heartRateSampleEpochMs", "heartRateAvailable", now)
                ?.takeIf { it > 0 }?.toInt()?.toString() ?: "--", "bpm", label)
            "cadence" -> Value(live(record, "cadenceLatest", "cadenceSampleEpochMs", "cadenceAvailable", now)
                ?.toInt()?.toString() ?: "--", "spm", label)
            "calories" -> Value(nonnegative(record, "calorie")?.toInt()?.toString() ?: "--", "kcal", label)
            else -> Value("--", "", label)
        }
    }
    private fun nonnegative(record: JSONObject?, key: String): Double? {
        if (record == null || !record.has(key) || record.isNull(key)) return null
        return (record.opt(key) as? Number)?.toDouble()?.takeIf { it.isFinite() && it >= 0 }
    }
    private fun live(record: JSONObject?, value: String, timestamp: String, available: String, now: Long): Double? {
        if (record == null || record.optString("state") != "ACTIVE" || !record.optBoolean(available)) return null
        val sampleTime = record.optLong(timestamp, Long.MIN_VALUE / 2)
        if (sampleTime < record.optLong("liveSinceEpochMs", record.optLong("startTimestamp") * 1000)) return null
        val age = now - sampleTime
        if (age !in 0..LIVE_MAX_AGE_MS) return null
        return nonnegative(record, value)
    }
    private fun pace(seconds: Double): String = if (seconds.isFinite() && seconds >= 0 && seconds <= Int.MAX_VALUE)
        time(Math.round(seconds)) else "--"
    private fun decimal(value: Double, places: Int) = String.format(Locale.getDefault(), "%.${places}f", value)
    private fun time(seconds: Long): String = if (seconds >= 3600)
        String.format(Locale.getDefault(), "%d:%02d:%02d", seconds / 3600, seconds / 60 % 60, seconds % 60)
        else String.format(Locale.getDefault(), "%d:%02d", seconds / 60, seconds % 60)
}
