package com.hongtaeho.app.watch

import android.app.job.JobParameters
import android.app.job.JobService
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.facebook.react.jstasks.HeadlessJsTaskEventListener
import com.runtaeho.watchsync.WatchStore
import com.runtaeho.watchsync.WatchTransport
import java.util.UUID

/** JobScheduler owns network waiting/wake locks. ReactHost is shared with the foreground app. */
class WatchSyncTaskService : JobService(), HeadlessJsTaskEventListener {
    private class Attempt(val id: String, val parameters: JobParameters) {
        var revision = 0L
        var owner: String? = null
        var taskId: Int? = null
        var context: ReactContext? = null
        var listener: ReactInstanceEventListener? = null
        var completing = false
    }
    @Volatile private var attempt: Attempt? = null
    private val main = Handler(Looper.getMainLooper())
    private val host: ReactHost get() = (application as ReactApplication).reactHost!!
    private val deadline = Runnable { attempt?.let {
        Log.w("WatchSync", "Upload job deadline reached; retry deferred")
        abort(it, true, true)
    } }

    override fun onStartJob(params: JobParameters): Boolean {
        val run = Attempt(UUID.randomUUID().toString(), params)
        attempt = run; active = this
        main.postDelayed(deadline, 60000) // Includes React startup, hydration and upload.
        WatchTransport.executor.execute {
            try {
                val store = WatchStore(this)
                val ledger = WatchUploadLedger(store.read("upload-job"))
                if (ledger.consumeRepair(params.extras.getString("repairNonce"))) {
                    store.write("upload-job", ledger.json())
                }
                val eligible = ledger.shouldSchedule(WatchUploadScheduler.hasOwnedRecords(store))
                val owner = WatchUploadScheduler.owner(store)
                main.post {
                    if (!current(run.id)) return@post
                    if (!eligible) { finish(run, false, false); return@post }
                    run.revision = ledger.revision; run.owner = owner
                    startReact(run)
                }
            } catch (_: Exception) {
                Log.w("WatchSync", "Upload job storage initialization deferred")
                main.post { if (current(run.id)) abort(run, true, true) }
            }
        }
        return true
    }
    private fun startReact(run: Attempt) {
        try {
            val existing = host.currentReactContext
            if (existing != null) { startTask(run, existing); return }
            val listener = object : ReactInstanceEventListener {
                override fun onReactContextInitialized(context: ReactContext) {
                    main.post { if (current(run.id)) startTask(run, context) }
                }
            }
            run.listener = listener
            host.addReactInstanceEventListener(listener)
            host.currentReactContext?.let { startTask(run, it); return }
            host.start()
        } catch (_: Exception) {
            Log.w("WatchSync", "Upload React runtime initialization deferred")
            abort(run, true, true)
        }
    }
    private fun startTask(run: Attempt, context: ReactContext) {
        if (!current(run.id) || run.taskId != null) return
        run.listener?.let { host.removeReactInstanceEventListener(it) }; run.listener = null
        run.context = context
        val tasks = HeadlessJsTaskContext.getInstance(context)
        tasks.addTaskEventListener(this)
        try {
            run.taskId = tasks.startTask(HeadlessJsTaskConfig("WatchSyncUpload",
                Arguments.createMap().apply { putString("jobRunId", run.id) }, 0, true))
        } catch (_: Exception) {
            Log.w("WatchSync", "Upload JavaScript task startup deferred")
            abort(run, true, true)
        }
    }
    private fun complete(runId: String, outcome: String, reply: (Boolean) -> Unit) {
        val run = attempt
        if (run == null || run.id != runId || run.completing) { reply(false); return }
        run.completing = true
        WatchTransport.executor.execute {
            val retry = try {
                val store = WatchStore(this)
                val ledger = WatchUploadLedger(store.read("upload-job"))
                val retry = ledger.complete(run.revision, outcome, WatchUploadScheduler.hasOwnedRecords(store))
                store.write("upload-job", ledger.json())
                retry
            } catch (_: Exception) { Log.w("WatchSync", "Upload job result deferred; inbox retained"); true }
            main.post {
                if (!current(runId)) { reply(false); return@post }
                finish(run, retry, false)
                reply(true)
            }
        }
    }
    private fun current(id: String) = attempt?.id == id
    private fun detach(run: Attempt, cancelJs: Boolean) {
        attempt = null
        if (active === this) active = null
        main.removeCallbacks(deadline)
        run.listener?.let { host.removeReactInstanceEventListener(it) }
        run.context?.let { context ->
            val tasks = HeadlessJsTaskContext.getInstance(context)
            tasks.removeTaskEventListener(this)
            if (cancelJs) {
                RNWatchSyncBridgeModule.notifyStopped(run.id)
                run.taskId?.let { if (tasks.isTaskRunning(it)) tasks.finishTask(it) }
            }
        }
    }
    private fun finish(run: Attempt, retry: Boolean, cancelJs: Boolean) {
        detach(run, cancelJs)
        jobFinished(run.parameters, retry)
        // A concurrent DataItem/login can have arrived while this attempt was finishing.
        if (!retry) WatchUploadScheduler.afterTerminal(this, run.revision)
    }
    private fun abort(run: Attempt, retry: Boolean, report: Boolean) {
        detach(run, true)
        if (report) jobFinished(run.parameters, retry)
    }
    override fun onStopJob(params: JobParameters): Boolean {
        val run = attempt ?: return false
        abort(run, true, false) // No I/O/main-thread waits; the next run rechecks owner and inbox.
        return true
    }
    override fun onHeadlessJsTaskStart(taskId: Int) { }
    override fun onHeadlessJsTaskFinish(taskId: Int) {
        val run = attempt ?: return
        if (run.taskId == taskId && !run.completing) complete(run.id, "retry") { }
    }
    override fun onDestroy() {
        attempt?.let { abort(it, true, false) }
        super.onDestroy()
    }
    companion object {
        @Volatile private var active: WatchSyncTaskService? = null
        fun isRunning() = active?.attempt != null
        fun isActive(id: String) = active?.attempt?.id == id
        fun finishRun(id: String, outcome: String, reply: (Boolean) -> Unit) {
            Handler(Looper.getMainLooper()).post {
                val service = active
                if (service == null) reply(false) else service.complete(id, outcome, reply)
            }
        }
        fun ownerLinked(owner: String?) {
            Handler(Looper.getMainLooper()).post {
                val service = active ?: return@post
                val run = service.attempt ?: return@post
                if (run.owner != null && run.owner != owner) {
                    service.finish(run, false, true)
                }
            }
        }
    }
}
