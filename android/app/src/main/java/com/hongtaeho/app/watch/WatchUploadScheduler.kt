package com.hongtaeho.app.watch

import android.app.job.JobInfo
import android.app.job.JobScheduler
import android.content.ComponentName
import android.content.Context
import android.util.Log
import android.os.PersistableBundle
import java.util.UUID
import com.runtaeho.watchsync.WatchStore
import com.runtaeho.watchsync.WatchTransport

object WatchUploadScheduler {
    private const val JOB_ID = 87104
    fun afterTerminal(context: Context, completedRevision: Long) {
        WatchTransport.executor.execute { ensureOnWorker(context, completedRevision) }
    }
    fun signalOnWorker(context: Context) {
        try {
            val store = WatchStore(context)
            val ledger = WatchUploadLedger(store.read("upload-job"))
            ledger.signal()
            store.write("upload-job", ledger.json())
            WatchSyncTaskService.ownerLinked(owner(store))
            ensureOnWorker(context)
        } catch (_: Exception) {
            Log.w("WatchSync", "Upload signal persistence failed; requesting metadata recovery")
            // The inbox was committed first. Persist a scheduler-owned repair signal rather than lose this wake.
            schedule(context, 0, UUID.randomUUID().toString())
        }
    }
    fun owner(store: WatchStore): String? = store.read("owner")?.optString("ownerUserId")
        ?.takeIf { it.toLongOrNull()?.let { id -> id > 0 } == true }
    fun hasOwnedRecords(store: WatchStore): Boolean {
        val owner = owner(store) ?: return false
        return store.entries("inbox-").any { it.optString("ownerUserId") == owner }
    }
    fun ensureOnWorker(context: Context, completedRevision: Long? = null) {
        try {
            val store = WatchStore(context)
            val ledger = WatchUploadLedger(store.read("upload-job"))
            val ownedRecords = hasOwnedRecords(store)
            val scheduler = context.getSystemService(JobScheduler::class.java)
            if (WatchSyncTaskService.isRunning()) return // Never replace a running job or reset its backoff.
            val pending = scheduler.getPendingJob(JOB_ID)
            val repairNonce = pending?.extras?.getString("repairNonce")
            val repairPending = repairNonce != null && ledger.hasUnconsumedRepair(repairNonce)
            if (!ledger.shouldSchedule(ownedRecords, repairNonce)) { scheduler.cancel(JOB_ID); return }
            if (repairPending) return // Its scheduler-owned wake survives an unsuccessful metadata write.
            if (pending != null && (completedRevision == null || pending.extras.getLong("revision", -1) > completedRevision)) return
            schedule(context, ledger.revision, null)
        } catch (_: Exception) { Log.w("WatchSync", "Upload scheduling deferred; inbox retained") }
    }
    private fun schedule(context: Context, revision: Long, repairNonce: String?) {
        try {
            val job = JobInfo.Builder(JOB_ID, ComponentName(context, WatchSyncTaskService::class.java))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPersisted(true)
                .setExtras(PersistableBundle().apply { putLong("revision", revision); if (repairNonce != null) putString("repairNonce", repairNonce) })
                .setBackoffCriteria(30000, JobInfo.BACKOFF_POLICY_EXPONENTIAL).build()
            if (context.getSystemService(JobScheduler::class.java).schedule(job) != JobScheduler.RESULT_SUCCESS)
                Log.w("WatchSync", "Upload job scheduling deferred; inbox retained")
        } catch (_: Exception) { Log.w("WatchSync", "Upload job scheduling unavailable; inbox retained") }
    }

}
