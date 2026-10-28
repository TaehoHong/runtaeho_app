package com.hongtaeho.app.watch

import org.json.JSONObject

/** A terminal result suppresses only the exact work generation it observed. */
class WatchUploadLedger(saved: JSONObject?) {
    var revision = saved?.optLong("revision", 0)?.coerceAtLeast(0) ?: 0
        private set
    var terminalRevision = (saved?.optLong("terminalRevision", -1) ?: -1).coerceIn(-1, revision)
        private set
    private var consumedRepair = saved?.optString("consumedRepair")?.takeUnless { it.isEmpty() || it == "null" }
    fun signal() { revision += 1 }
    fun hasUnconsumedRepair(nonce: String) = nonce != consumedRepair
    fun consumeRepair(nonce: String?): Boolean {
        if (nonce == null || nonce == consumedRepair) return false
        signal(); consumedRepair = nonce
        return true
    }
    @JvmOverloads
    fun shouldSchedule(hasOwnedRecords: Boolean, repairNonce: String? = null) =
        hasOwnedRecords && (revision > terminalRevision || (repairNonce != null && repairNonce != consumedRepair))
    fun complete(startedRevision: Long, outcome: String, hasOwnedRecords: Boolean): Boolean {
        require(outcome in setOf("success", "blocked-auth", "retry"))
        if (outcome != "retry") terminalRevision = maxOf(terminalRevision, minOf(startedRevision, revision))
        return hasOwnedRecords && (outcome == "retry" || revision > terminalRevision)
    }
    fun json() = JSONObject().put("revision", revision).put("terminalRevision", terminalRevision).put("consumedRepair", consumedRepair ?: JSONObject.NULL)
}
