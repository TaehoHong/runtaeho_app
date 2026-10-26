package com.runtaeho.wear

import android.Manifest
import android.app.*
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.LocationManager
import android.os.*
import androidx.health.services.client.HealthServices
import androidx.health.services.client.ExerciseUpdateCallback
import androidx.health.services.client.data.*
import com.google.common.util.concurrent.ListenableFuture
import com.runtaeho.watchsync.WatchRecords
import com.runtaeho.watchsync.WatchStore
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.util.UUID

/** Health Services owns workout state/time; private atomic snapshots own recovery/outbox. */
class RunService : Service(), ExerciseUpdateCallback {
    private val client by lazy { HealthServices.getClient(this).exerciseClient }
    private val store by lazy { WatchStore(this) }
    private var run: JSONObject? = null
    private var commandPending = false
    private var pendingStart: ExerciseConfig? = null
    override fun onBind(intent: Intent?) = null

    override fun onCreate() {
        super.onCreate()
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel("running", "러닝 기록", NotificationManager.IMPORTANCE_LOW))
        run = store.read("active")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            val types = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH else 0
            val location = if (has(Manifest.permission.ACCESS_FINE_LOCATION)) ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION else 0
            startForeground(7, notification(), types or location)
            when (intent?.action) {
                "START" -> if (run == null && !commandPending) startRun()
                "PAUSE" -> if (run?.optString("state") == "ACTIVE") command { client.pauseExerciseAsync() }
                "RESUME" -> if (run?.optString("state") == "PAUSED") command { client.resumeExerciseAsync() }
                "END" -> if (run != null) command { client.endExerciseAsync() }
                else -> recover()
            }
        } catch (_: Exception) {
            error("권한 또는 기록 서비스를 확인해 주세요")
            stopSelf()
        }
        return START_STICKY
    }

    private fun startRun() {
        val owner = store.read("owner")?.optString("ownerUserId")?.toLongOrNull()
        if (owner == null || owner <= 0) { error("휴대폰에서 로그인하고 워치를 연결해 주세요"); return }
        if (!has(Manifest.permission.ACTIVITY_RECOGNITION)) { error("활동 권한이 필요합니다"); return }
        commandPending = true
        future(client.getCurrentExerciseInfoAsync()) { info ->
            if (!ExerciseOwnership.isFree(info)) {
                commandPending = false
                error("이미 진행 중인 운동이 있습니다. 기존 운동을 먼저 확인해 주세요")
                return@future
            }
            future(client.getCapabilitiesAsync()) { capabilities ->
                if (ExerciseType.RUNNING !in capabilities.supportedExerciseTypes) {
                    commandPending = false; error("이 기기는 러닝 기록을 지원하지 않습니다"); return@future
                }
                val supported = capabilities.getExerciseTypeCapabilities(ExerciseType.RUNNING).supportedDataTypes
                if (DataType.DISTANCE_TOTAL !in supported) {
                    commandPending = false; error("이 기기는 거리 측정을 지원하지 않습니다"); return@future
                }
                val types = mutableSetOf<DataType<*, *>>(DataType.DISTANCE_TOTAL)
                val gps = has(Manifest.permission.ACCESS_FINE_LOCATION) &&
                    getSystemService(LocationManager::class.java).isProviderEnabled(LocationManager.GPS_PROVIDER)
                if (gps && DataType.LOCATION in supported) types.add(DataType.LOCATION)
                val hrPermission = if (Build.VERSION.SDK_INT >= 36) "android.permission.health.READ_HEART_RATE" else Manifest.permission.BODY_SENSORS
                if (has(hrPermission) && DataType.HEART_RATE_BPM in supported) types.add(DataType.HEART_RATE_BPM)
                if (DataType.CALORIES_TOTAL in supported) types.add(DataType.CALORIES_TOTAL)
                if (DataType.STEPS_PER_MINUTE in supported) types.add(DataType.STEPS_PER_MINUTE)
                if (DataType.SPEED in supported) types.add(DataType.SPEED)
                val now = System.currentTimeMillis()
                run = JSONObject().put("schemaVersion", 1).put("sessionId", UUID.randomUUID().toString())
                    .put("ownerUserId", owner).put("source", "WEAR_OS").put("startTimestamp", now / 1000)
                    .put("durationMs", 0).put("bootEpochMs", now - SystemClock.elapsedRealtime()).put("checkpointTime", now).put("state", "STARTING")
                    .put("gpsPoints", JSONArray()).put("gpsEnabled", gps && DataType.LOCATION in types)
                    .put("heartRateSum", 0.0).put("heartRateCount", 0).put("lastHeartTime", -1L)
                    .put("cadenceSum", 0.0).put("cadenceCount", 0).put("lastCadenceTime", -1L)
                save()
                val config = ExerciseConfig.builder(ExerciseType.RUNNING).setDataTypes(types)
                    .setIsGpsEnabled(gps && DataType.LOCATION in types).setIsAutoPauseAndResumeEnabled(false).build()
                pendingStart = config
                client.setUpdateCallback(mainExecutor, this)
            }
        }
    }

    private fun recover() {
        if (run == null) { stopSelf(); return }
        run?.put("state", "RECOVERING")
        run?.put("speedAvailable", false)?.put("cadenceAvailable", false)?.put("heartRateAvailable", false)
        save()
        client.setUpdateCallback(mainExecutor, this)
        future(client.getCurrentExerciseInfoAsync()) { info ->
            if (!ExerciseOwnership.isOurs(info)) {
                // Preserve only measured duration; never count a process/reboot gap as active time.
                run?.put("state", "ENDED")
                if (!run!!.has("endTimestamp")) run!!.put("endTimestamp", run!!.optLong("lastMeasuredTime", run!!.getLong("checkpointTime")) / 1000)
                finalizeRun()
            }
        }
    }

    private fun command(action: () -> ListenableFuture<Void>) {
        if (commandPending) return
        commandPending = true
        run?.put("requestPending", true)
        save()
        future(action()) { /* State changes only after the matching Health Services update. */ }
    }

    private fun <T> future(value: ListenableFuture<T>, complete: (T) -> Unit) {
        value.addListener({
            try { complete(value.get()) }
            catch (_: Exception) {
                commandPending = false
                run?.put("requestPending", false)
                save()
                if (run?.optString("state") == "STARTING") archiveUnmeasured("시작하지 못한 기록을 워치에 보관했습니다. 다시 시작해 주세요")
                else error("운동 요청 실패. 권한과 기록 상태를 확인해 주세요")
            }
        }, mainExecutor)
    }

    override fun onExerciseUpdateReceived(update: ExerciseUpdate) {
        val record = run ?: return
        try {
            val state = update.exerciseStateInfo.state
            val previousState = record.optString("state")
            if (state == ExerciseState.ACTIVE && previousState != "ACTIVE") {
                record.put("speedAvailable", false).put("cadenceAvailable", false).put("heartRateAvailable", false)
                    .put("liveSinceEpochMs", System.currentTimeMillis())
            }
            val checkpoint = update.activeDurationCheckpoint
            if (checkpoint != null) {
                record.put("durationMs", checkpoint.activeDuration.toMillis())
                    .put("checkpointTime", checkpoint.time.toEpochMilli())
            }
            update.startTime?.let { record.put("startTimestamp", it.epochSecond) }
            record.put("lastMeasuredTime", System.currentTimeMillis())
            record.put("state", when {
                state.isEnded -> "ENDED"
                state.isPaused -> "PAUSED"
                state == ExerciseState.ACTIVE -> "ACTIVE"
                else -> "TRANSITION"
            })
            if (state.isPaused || state == ExerciseState.ACTIVE || state.isEnded) {
                commandPending = false
                record.put("requestPending", false)
            }
            update.latestMetrics.getData(DataType.DISTANCE_TOTAL)?.total?.takeIf { it.isFinite() && it >= 0 }?.let { record.put("distance", it) }
            update.latestMetrics.getData(DataType.CALORIES_TOTAL)?.total?.takeIf { it.isFinite() && it >= 0 }?.let { record.put("calorie", it.toInt()) }
            val bootEpochMs = record.getLong("bootEpochMs")
            update.latestMetrics.getData(DataType.SPEED).forEach { point ->
                val epochMs = bootEpochMs + point.timeDurationFromBoot.toMillis()
                LiveMetricSamples.capture(record, "speed", point.value, epochMs, System.currentTimeMillis())
            }
            update.latestMetrics.getData(DataType.HEART_RATE_BPM).forEach { point ->
                val time = point.timeDurationFromBoot.toMillis()
                LiveMetricSamples.capture(record, "heartRate", point.value, bootEpochMs + time, System.currentTimeMillis())
                if (time > record.getLong("lastHeartTime") && point.value.isFinite() && point.value > 0) {
                    record.put("heartRateSum", record.getDouble("heartRateSum") + point.value)
                        .put("heartRateCount", record.getInt("heartRateCount") + 1).put("lastHeartTime", time)
                }
            }
            update.latestMetrics.getData(DataType.STEPS_PER_MINUTE).forEach { point ->
                val time = point.timeDurationFromBoot.toMillis()
                LiveMetricSamples.capture(record, "cadence", point.value.toDouble(), bootEpochMs + time, System.currentTimeMillis())
                if (time > record.getLong("lastCadenceTime") && point.value > 0) {
                    record.put("cadenceSum", record.getDouble("cadenceSum") + point.value)
                        .put("cadenceCount", record.getInt("cadenceCount") + 1).put("lastCadenceTime", time)
                }
            }
            val route = record.getJSONArray("gpsPoints")
            val boot = Instant.ofEpochMilli(record.getLong("bootEpochMs"))
            update.latestMetrics.getData(DataType.LOCATION).forEach { point ->
                val location = point.value
                val timestamp = point.getTimeInstant(boot).toEpochMilli()
                val previousTime = if (route.length() > 0) route.getJSONObject(route.length() - 1).getLong("timestampMs") else 0
                if (timestamp >= record.getLong("startTimestamp") * 1000 && timestamp <= System.currentTimeMillis() && timestamp > previousTime && route.length() < 100000 && location.latitude.isFinite() &&
                    location.longitude.isFinite() && location.latitude in -90.0..90.0 && location.longitude in -180.0..180.0) {
                    val accuracy = (point.accuracy as? LocationAccuracy)?.horizontalPositionErrorMeters
                    val altitude = location.altitude.takeIf { it.isFinite() } ?: 0.0
                    route.put(JSONObject().put("latitude", location.latitude).put("longitude", location.longitude)
                        .put("timestampMs", timestamp).put("speed", 0).put("altitude", altitude)
                        .put("accuracy", accuracy?.takeIf { it.isFinite() && it >= 0 } ?: JSONObject.NULL))
                }
            }
            save()
            if (state.isEnded) {
                record.put("endTimestamp", System.currentTimeMillis() / 1000)
                finalizeRun()
            }
        } catch (_: Exception) { error("기록 저장 실패. 앱을 종료하지 말고 저장 공간을 확인해 주세요") }
    }

    private fun finalizeRun() {
        val record = run ?: return
        if (!record.has("distance")) {
            archiveUnmeasured("거리 측정값이 없어 전송할 수 없습니다. 기록은 워치에 보관됩니다")
            return
        }
        val payload = JSONObject().put("schemaVersion", 1).put("sessionId", record.getString("sessionId"))
            .put("ownerUserId", record.getLong("ownerUserId")).put("source", "WEAR_OS")
            .put("startTimestamp", record.getLong("startTimestamp")).put("endTimestamp", record.getLong("endTimestamp"))
            .put("distance", record.getDouble("distance").toInt()).put("durationSec", record.getLong("durationMs") / 1000)
            .put("cadence", average(record, "cadence")).put("heartRate", average(record, "heartRate"))
            .put("calorie", record.optInt("calorie")).put("gpsPoints", record.getJSONArray("gpsPoints"))
        if (!WatchRecords.validTimeline(payload)) {
            store.archiveClockError(record)
            run = null
            pendingStart = null
            commandPending = false
            error("기기 시간 변경으로 전송할 수 없습니다. 기록은 워치에 보관됩니다")
            return
        }
        store.write("pending-" + record.getString("sessionId"), payload)
        store.write("status", JSONObject().put("message", "저장됨 · 휴대폰 연결 시 자동 전송"))
        store.remove("active")
        run = null
        WatchDataService.retry(this)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }
    private fun archiveUnmeasured(message: String) {
        run?.let { store.archiveUnmeasured(it) }
        run = null
        pendingStart = null
        commandPending = false
        error(message)
    }
    private fun average(record: JSONObject, metric: String): Int {
        val count = record.optInt(metric + "Count")
        return if (count == 0) 0 else (record.getDouble(metric + "Sum") / count).toInt().coerceIn(0, 255)
    }
    private fun has(permission: String) = checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED
    private fun save() { run?.let { store.write("active", it) } }
    private fun error(message: String) {
        store.write("status", JSONObject().put("message", message))
        if (run == null) { stopForeground(STOP_FOREGROUND_REMOVE); stopSelf() }
    }
    private fun notification(): Notification {
        val pending = PendingIntent.getActivity(this, 0, Intent(this, RunActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        return Notification.Builder(this, "running").setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("러닝 기록 중").setContentText("눌러서 기록 확인").setContentIntent(pending).setOngoing(true).build()
    }
    override fun onRegistered() {
        val config = pendingStart ?: return
        pendingStart = null
        future(client.startExerciseAsync(config)) { commandPending = false }
    }
    override fun onRegistrationFailed(throwable: Throwable) {
        commandPending = false
        if (pendingStart != null) archiveUnmeasured("운동 센서 연결 실패. 다시 시작해 주세요")
        else error("운동 센서 연결 실패. 앱을 다시 열어 복구해 주세요")
    }
    override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) { }
    override fun onAvailabilityChanged(dataType: DataType<*, *>, availability: Availability) {
        val key = when (dataType) {
            DataType.HEART_RATE_BPM -> "heartRateAvailable"
            DataType.SPEED -> "speedAvailable"
            DataType.STEPS_PER_MINUTE -> "cadenceAvailable"
            else -> return
        }
        run?.put(key, availability == DataTypeAvailability.AVAILABLE)
        save()
    }
    override fun onDestroy() {
        client.clearUpdateCallbackAsync(this)
        super.onDestroy()
    }
}
