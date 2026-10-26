package com.runtaeho.watchsync

import android.content.Context
import android.system.Os
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

/** Private, backup-excluded files. fsync before atomic replacement survives process loss. */
class WatchStore(private val directory: File, private val replace: (File, File) -> Unit) {
    constructor(context: Context) : this(File(context.noBackupFilesDir, "watch-sync-v1"),
        { from, to -> Os.rename(from.absolutePath, to.absolutePath) })
    init { check(directory.isDirectory || directory.mkdirs()) { "Cannot create watch storage" } }

    fun read(key: String): JSONObject? = synchronized(lock) {
        val file = file(key)
        if (!file.exists()) null else JSONObject(file.readText())
    }
    fun write(key: String, value: JSONObject) = synchronized(lock) {
        val target = file(key)
        val temporary = File(directory, "$key.new")
        FileOutputStream(temporary).use { stream ->
            stream.write(value.toString().toByteArray(Charsets.UTF_8))
            stream.fd.sync()
        }
        replace(temporary, target)
        Unit
    }
    fun remove(key: String) = synchronized(lock) {
        val target = file(key)
        check(!target.exists() || target.delete()) { "Cannot remove watch record" }
    }
    fun entries(prefix: String): List<JSONObject> = synchronized(lock) {
        directory.listFiles().orEmpty().filter { it.name.startsWith(prefix) && it.name.endsWith(".json") }
            .mapNotNull { read(it.name.removeSuffix(".json")) }
    }
    fun retainIncoming(record: JSONObject): Boolean = synchronized(lock) {
        val id = record.getString("sessionId")
        if (read("ack-$id")?.let { WatchRecords.sameRecord(record, it) } == true || read("inbox-$id") != null) false
        else { write("inbox-$id", record); true }
    }
    fun acknowledgeIncoming(ack: JSONObject) = synchronized(lock) {
        val id = ack.getString("sessionId")
        val record = read("inbox-$id") ?: return@synchronized
        require(WatchRecords.sameRecord(record, ack)) { "Acknowledgement mismatch" }
        write("ack-$id", ack)
        remove("inbox-$id")
    }
    fun acknowledgePending(ack: JSONObject): Boolean = synchronized(lock) {
        val id = ack.getString("sessionId")
        val record = read("pending-$id") ?: return@synchronized false
        if (!WatchRecords.sameRecord(record, ack)) return@synchronized false
        write("receipt-$id", ack)
        remove("pending-$id")
        true
    }
    fun archiveUnmeasured(record: JSONObject) = synchronized(lock) {
        write("unmeasured-" + record.getString("sessionId"), record)
        remove("active")
    }
    fun archiveClockError(record: JSONObject) = synchronized(lock) {
        write("clock-error-" + record.getString("sessionId"), record.put("archiveReason", "CLOCK_ANOMALY"))
        remove("active")
    }
    private fun file(key: String): File {
        require(key.matches(Regex("[A-Za-z0-9-]+"))) { "Invalid watch storage key" }
        return File(directory, "$key.json")
    }
    companion object { private val lock = Any() }
}
