package com.runtaeho.wear

import org.json.JSONArray
import org.json.JSONObject

/** Display-only settings; canonical workout values never pass through this model. */
class RunDisplayPreferences(saved: JSONObject?) {
    var unit: String = "KPH"
        private set
    private val choices = defaults.map { values -> labels.keys.filter { it in values }.toMutableList() }.toMutableList()
    private val current = mutableListOf("currentPace", "duration", "heartRate", "cadence")

    init {
        if (saved?.optInt("schemaVersion") == 1) {
            if (saved.optString("unit") == "MPH") unit = "MPH"
            val slots = saved.optJSONArray("slots")
            for (slot in 0..3) {
                val value = slots?.optJSONObject(slot) ?: continue
                val metrics = value.optJSONArray("metrics") ?: continue
                val savedValues = (0 until metrics.length()).map { metrics.optString(it) }
                val recovered = labels.keys.filter { it in savedValues }.take(3)
                if (recovered.isEmpty()) continue
                choices[slot] = recovered.toMutableList()
                current[slot] = value.optString("active").takeIf { it in recovered } ?: recovered.first()
            }
        }
    }
    fun setUnit(value: String) { require(value == "KPH" || value == "MPH"); unit = value }
    fun selected(slot: Int): List<String> = choices[slot].toList()
    fun active(slot: Int): String = current[slot]
    fun cycle(slot: Int): String {
        val items = choices[slot]
        current[slot] = items[(items.indexOf(current[slot]) + 1) % items.size]
        return current[slot]
    }
    fun toggle(slot: Int, metric: String): Boolean {
        require(metric in labels)
        val items = choices[slot]
        if (metric in items) {
            if (items.size == 1) return false
            items.remove(metric)
            if (current[slot] !in items) current[slot] = items.first()
        } else {
            if (items.size == 3) return false
            items.add(metric)
            choices[slot] = labels.keys.filter { it in items }.toMutableList()
        }
        return true
    }
    fun toJson(): JSONObject = JSONObject().put("schemaVersion", 1).put("unit", unit).put("slots",
        JSONArray().apply {
            for (slot in 0..3) put(JSONObject().put("metrics", JSONArray(choices[slot])).put("active", current[slot]))
        })

    companion object {
        val labels = linkedMapOf("distance" to "거리", "duration" to "시간", "currentPace" to "현재 페이스",
            "averagePace" to "평균 페이스", "heartRate" to "심박", "cadence" to "케이던스", "speed" to "속도", "calories" to "칼로리")
        private val defaults = listOf(listOf("currentPace", "averagePace", "speed"), listOf("duration", "distance"),
            listOf("heartRate", "calories"), listOf("cadence", "averagePace"))
    }
}
