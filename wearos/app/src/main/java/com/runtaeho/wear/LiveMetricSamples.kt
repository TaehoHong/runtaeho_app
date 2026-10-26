package com.runtaeho.wear

import org.json.JSONObject

/** Local live cache only. Aggregates and completed-record payloads keep their existing owner. */
object LiveMetricSamples {
    fun capture(record: JSONObject, metric: String, value: Double, sampleEpochMs: Long, now: Long): Boolean {
        require(metric == "speed" || metric == "heartRate" || metric == "cadence")
        val timestampKey = metric + "SampleEpochMs"
        if (record.optString("state") != "ACTIVE" || !value.isFinite() || value < 0 ||
            sampleEpochMs < record.optLong("liveSinceEpochMs", record.optLong("startTimestamp") * 1000) ||
            sampleEpochMs > now || sampleEpochMs <= record.optLong(timestampKey)) return false
        record.put(if (metric == "speed") metric else metric + "Latest", value)
            .put(timestampKey, sampleEpochMs).put(metric + "Available", true)
        return true
    }
}
