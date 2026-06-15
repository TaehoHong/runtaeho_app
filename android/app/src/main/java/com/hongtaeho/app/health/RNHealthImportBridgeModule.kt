package com.hongtaeho.app.health

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.permission.HealthPermission.Companion.PERMISSION_READ_HEALTH_DATA_HISTORY
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseRouteResult
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsCadenceRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.hongtaeho.app.BuildConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.time.Instant
import kotlin.math.roundToInt

class RNHealthImportBridgeModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val permissionContract = PermissionController.createRequestPermissionResultContract()
    private var pendingPermissionPromise: Promise? = null
    private var pendingPermissionSet: Set<String> = emptySet()

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun isAvailable(promise: Promise) {
        val available = isHealthConnectAvailable()
        logHealthRaw("availability response", mapOf("available" to available))
        promise.resolve(available)
    }

    @ReactMethod
    fun getPermissionStatus(promise: Promise) {
        val client = healthConnectClientOrNull()
        if (client == null) {
            promise.resolve("unavailable")
            return
        }

        scope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                val expected = permissionsFor(includeHistory = true)
                logHealthRaw(
                    "getGrantedPermissions response",
                    mapOf(
                        "grantedCount" to granted.size,
                        "expectedCount" to expected.size,
                        "status" to toPermissionStatus(granted, expected)
                    )
                )
                promise.resolve(
                    toPermissionStatus(
                        granted,
                        expected
                    )
                )
            } catch (error: Exception) {
                logHealthRaw("getGrantedPermissions failed", errorLog(error))
                promise.resolve("denied")
            }
        }
    }

    @ReactMethod
    fun requestPermissions(options: ReadableMap, promise: Promise) {
        if (!isHealthConnectAvailable()) {
            promise.resolve("unavailable")
            return
        }

        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("health_activity_unavailable", "Current activity is unavailable.")
            return
        }

        if (pendingPermissionPromise != null) {
            promise.reject("health_permission_in_progress", "Health permission request is already running.")
            return
        }

        val permissions = permissionsFor(includeHistory = options.booleanOrFalse("includeHistory"))

        logHealthRaw(
            "requestPermissions request",
            mapOf(
                "includeHistory" to options.booleanOrFalse("includeHistory"),
                "includeRoute" to options.booleanOrFalse("includeRoute"),
                "permissionCount" to permissions.size
            )
        )
        pendingPermissionPromise = promise
        pendingPermissionSet = permissions

        try {
            val intent = permissionContract.createIntent(activity, permissions)
            activity.startActivityForResult(intent, REQUEST_HEALTH_PERMISSIONS)
        } catch (error: Exception) {
            pendingPermissionPromise = null
            pendingPermissionSet = emptySet()
            logHealthRaw("requestPermissions failed", errorLog(error))
            promise.reject("health_permission_failed", error.message, error)
        }
    }

    @ReactMethod
    fun readRunningWorkouts(params: ReadableMap, promise: Promise) {
        val client = healthConnectClientOrNull()
        if (client == null) {
            promise.resolve(Arguments.createArray())
            return
        }

        val start = Instant.ofEpochSecond(params.doubleOrDefault("startTimestamp", 0.0).toLong().coerceAtLeast(0))
        val endSeconds = params.doubleOrDefault("endTimestamp", Instant.now().epochSecond.toDouble()).toLong()
        val end = Instant.ofEpochSecond(maxOf(endSeconds, start.epochSecond))
        val pageSize = params.intOrDefault("limit", 1000).coerceIn(1, 5000)

        logHealthRaw(
            "ReadRecordsRequest request",
            mapOf(
                "recordType" to "ExerciseSessionRecord",
                "startEpochSecond" to start.epochSecond,
                "endEpochSecond" to end.epochSecond,
                "ascendingOrder" to true,
                "pageSize" to pageSize
            )
        )
        scope.launch {
            try {
                val records = Arguments.createArray()
                var pageToken: String? = null
                var pageIndex = 0

                do {
                    val response = client.readRecords(
                        ReadRecordsRequest(
                            recordType = ExerciseSessionRecord::class,
                            timeRangeFilter = TimeRangeFilter.between(start, end),
                            ascendingOrder = true,
                            pageSize = pageSize,
                            pageToken = pageToken
                        )
                    )
                    val runningSessions = response.records.filter {
                        it.exerciseType == ExerciseSessionRecord.EXERCISE_TYPE_RUNNING
                    }
                    logHealthRaw(
                        "ReadRecordsResponse response",
                        mapOf(
                            "pageIndex" to pageIndex,
                            "recordCount" to response.records.size,
                            "runningRecordCount" to runningSessions.size,
                            "hasNextPage" to !response.pageToken.isNullOrBlank()
                        )
                    )

                    for ((sessionIndex, session) in runningSessions.withIndex()) {
                        records.pushMap(mapSession(client, session, pageIndex, sessionIndex))
                    }
                    pageToken = response.pageToken
                    pageIndex += 1
                } while (!pageToken.isNullOrBlank())

                logHealthRaw("readRunningWorkouts response", mapOf("recordCount" to records.size()))
                promise.resolve(records)
            } catch (error: Exception) {
                logHealthRaw("ReadRecordsRequest failed", errorLog(error))
                promise.reject("health_read_failed", error.message, error)
            }
        }
    }

    @ReactMethod
    fun openHealthSettings(promise: Promise) {
        try {
            val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("health_settings_failed", error.message, error)
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_HEALTH_PERMISSIONS) return

        val promise = pendingPermissionPromise ?: return
        val expectedPermissions = pendingPermissionSet
        pendingPermissionPromise = null
        pendingPermissionSet = emptySet()

        try {
            val granted = permissionContract.parseResult(resultCode, data)
            logHealthRaw(
                "requestPermissions response",
                mapOf(
                    "grantedCount" to granted.size,
                    "expectedCount" to expectedPermissions.size,
                    "status" to toPermissionStatus(granted, expectedPermissions)
                )
            )
            promise.resolve(toPermissionStatus(granted, expectedPermissions))
        } catch (error: Exception) {
            logHealthRaw("requestPermissions response failed", errorLog(error))
            promise.reject("health_permission_failed", error.message, error)
        }
    }

    override fun onNewIntent(intent: Intent) = Unit

    private suspend fun mapSession(
        client: HealthConnectClient,
        session: ExerciseSessionRecord,
        pageIndex: Int,
        sessionIndex: Int
    ) = Arguments.createMap().apply {
        logHealthRaw(
            "ExerciseSessionRecord raw response item",
            mapOf(
                "pageIndex" to pageIndex,
                "sessionIndex" to sessionIndex,
                "sourcePackageName" to session.metadata.dataOrigin.packageName,
                "exerciseType" to session.exerciseType,
                "startEpochSecond" to session.startTime.epochSecond,
                "endEpochSecond" to session.endTime.epochSecond,
                "durationSec" to (session.endTime.epochSecond - session.startTime.epochSecond).coerceAtLeast(0),
                "routeResultType" to routeResultType(session.exerciseRouteResult)
            )
        )
        val distance = readDistance(client, session.startTime, session.endTime)
        val calorie = readCalories(client, session.startTime, session.endTime)
        val heartRate = readHeartRate(client, session.startTime, session.endTime)
        val cadence = readCadence(client, session.startTime, session.endTime)
        val gpsPoints = readExerciseRoute(client, session, pageIndex, sessionIndex)
        val sourcePackageName = session.metadata.dataOrigin.packageName

        putString("sourceRecordId", "health-connect:$sourcePackageName:${session.metadata.id}")
        putString("sourceBundleId", sourcePackageName)
        putDouble("startTimestamp", session.startTime.epochSecond.toDouble())
        putDouble("endTimestamp", session.endTime.epochSecond.toDouble())
        putInt("distance", distance.roundToInt())
        putInt("durationSec", (session.endTime.epochSecond - session.startTime.epochSecond).toInt().coerceAtLeast(0))
        putInt("calorie", calorie.roundToInt())
        putInt("cadence", cadence.roundToInt())
        putInt("heartRate", heartRate.roundToInt())
        putArray("gpsPoints", gpsPoints.points)
        putString("routeStatus", gpsPoints.status)
    }

    private fun mapExerciseRoute(
        routeResult: ExerciseRouteResult,
        pageIndex: Int,
        sessionIndex: Int,
        source: String
    ): RouteReadResult {
        return when (routeResult) {
            is ExerciseRouteResult.Data -> {
                val points = Arguments.createArray()
                val route = routeResult.exerciseRoute.route
                logHealthRaw(
                    "ExerciseRouteResult raw response",
                    mapOf(
                        "pageIndex" to pageIndex,
                        "sessionIndex" to sessionIndex,
                        "source" to source,
                        "type" to "Data",
                        "locationCount" to route.size,
                        "firstTimestampMs" to (route.firstOrNull()?.time?.toEpochMilli() ?: 0L),
                        "lastTimestampMs" to (route.lastOrNull()?.time?.toEpochMilli() ?: 0L)
                    )
                )
                route.forEach { location ->
                    points.pushMap(Arguments.createMap().apply {
                        putDouble("latitude", location.latitude)
                        putDouble("longitude", location.longitude)
                        putDouble("timestampMs", location.time.toEpochMilli().toDouble())
                        putDouble("speed", 0.0)
                        putDouble("altitude", location.altitude?.inMeters ?: 0.0)
                        location.horizontalAccuracy?.inMeters?.let { accuracy ->
                            putDouble("accuracy", accuracy)
                        }
                    })
                }
                RouteReadResult(
                    points = points,
                    status = if (route.isEmpty()) "notAvailable" else "available"
                )
            }
            is ExerciseRouteResult.ConsentRequired -> {
                logHealthRaw(
                    "ExerciseRouteResult raw response",
                    mapOf("pageIndex" to pageIndex, "sessionIndex" to sessionIndex, "source" to source, "type" to "ConsentRequired")
                )
                RouteReadResult(
                    points = Arguments.createArray(),
                    status = "permissionRequired"
                )
            }
            is ExerciseRouteResult.NoData -> {
                logHealthRaw(
                    "ExerciseRouteResult raw response",
                    mapOf("pageIndex" to pageIndex, "sessionIndex" to sessionIndex, "source" to source, "type" to "NoData")
                )
                RouteReadResult(
                    points = Arguments.createArray(),
                    status = "notAvailable"
                )
            }
            else -> {
                logHealthRaw(
                    "ExerciseRouteResult raw response",
                    mapOf("pageIndex" to pageIndex, "sessionIndex" to sessionIndex, "source" to source, "type" to routeResultType(routeResult))
                )
                RouteReadResult(
                    points = Arguments.createArray(),
                    status = "readFailed"
                )
            }
        }
    }

    private suspend fun readExerciseRoute(
        client: HealthConnectClient,
        session: ExerciseSessionRecord,
        pageIndex: Int,
        sessionIndex: Int
    ): RouteReadResult = try {
        logHealthRaw(
            "ReadRecordRequest route request",
            mapOf(
                "pageIndex" to pageIndex,
                "sessionIndex" to sessionIndex,
                "recordType" to "ExerciseSessionRecord"
            )
        )
        val routeResult = client.readRecord(ExerciseSessionRecord::class, session.metadata.id)
            .record
            .exerciseRouteResult
        logHealthRaw(
            "ReadRecordRequest route response",
            mapOf("pageIndex" to pageIndex, "sessionIndex" to sessionIndex, "routeResultType" to routeResultType(routeResult))
        )
        mapExerciseRoute(routeResult, pageIndex, sessionIndex, source = "readRecord")
    } catch (error: Exception) {
        logHealthRaw("ReadRecordRequest route failed", errorLog(error) + mapOf("pageIndex" to pageIndex, "sessionIndex" to sessionIndex))
        mapExerciseRoute(session.exerciseRouteResult, pageIndex, sessionIndex, source = "sessionRecord")
    }

    private suspend fun readDistance(client: HealthConnectClient, start: Instant, end: Instant): Double {
        return try {
            logAggregateRequest("DistanceRecord.DISTANCE_TOTAL", start, end)
            val result = client.aggregate(
                AggregateRequest(
                    metrics = setOf(DistanceRecord.DISTANCE_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )
            val value = result[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0
            logAggregateResponse("DistanceRecord.DISTANCE_TOTAL", value)
            value
        } catch (error: Exception) {
            logHealthRaw("AggregateRequest failed", errorLog(error) + mapOf("metric" to "DistanceRecord.DISTANCE_TOTAL"))
            0.0
        }
    }

    private suspend fun readCalories(client: HealthConnectClient, start: Instant, end: Instant): Double {
        return try {
            logAggregateRequest("ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL", start, end)
            val result = client.aggregate(
                AggregateRequest(
                    metrics = setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )
            val value = result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0
            logAggregateResponse("ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL", value)
            value
        } catch (error: Exception) {
            logHealthRaw("AggregateRequest failed", errorLog(error) + mapOf("metric" to "ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL"))
            0.0
        }
    }

    private suspend fun readHeartRate(client: HealthConnectClient, start: Instant, end: Instant): Double {
        return try {
            logAggregateRequest("HeartRateRecord.BPM_AVG", start, end)
            val result = client.aggregate(
                AggregateRequest(
                    metrics = setOf(HeartRateRecord.BPM_AVG),
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )
            val value = result[HeartRateRecord.BPM_AVG]?.toDouble() ?: 0.0
            logAggregateResponse("HeartRateRecord.BPM_AVG", value)
            value
        } catch (error: Exception) {
            logHealthRaw("AggregateRequest failed", errorLog(error) + mapOf("metric" to "HeartRateRecord.BPM_AVG"))
            0.0
        }
    }

    private suspend fun readCadence(client: HealthConnectClient, start: Instant, end: Instant): Double {
        return try {
            logAggregateRequest("StepsCadenceRecord.RATE_AVG", start, end)
            val result = client.aggregate(
                AggregateRequest(
                    metrics = setOf(StepsCadenceRecord.RATE_AVG),
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )
            val value = result[StepsCadenceRecord.RATE_AVG] ?: 0.0
            logAggregateResponse("StepsCadenceRecord.RATE_AVG", value)
            value
        } catch (error: Exception) {
            logHealthRaw("AggregateRequest failed", errorLog(error) + mapOf("metric" to "StepsCadenceRecord.RATE_AVG"))
            0.0
        }
    }

    private fun logAggregateRequest(metric: String, start: Instant, end: Instant) {
        logHealthRaw(
            "AggregateRequest request",
            mapOf(
                "metric" to metric,
                "startEpochSecond" to start.epochSecond,
                "endEpochSecond" to end.epochSecond
            )
        )
    }

    private fun logAggregateResponse(metric: String, value: Double) {
        logHealthRaw("AggregateRequest response", mapOf("metric" to metric, "value" to value))
    }

    private fun logHealthRaw(message: String, values: Map<String, Any?> = emptyMap()) {
        if (!BuildConfig.DEBUG) return
        Log.i(MODULE_NAME, "[HealthImport][Android] $message $values")
    }

    private fun errorLog(error: Exception): Map<String, Any?> = mapOf(
        "errorClass" to error::class.java.simpleName,
        "errorMessage" to error.message
    )

    private fun routeResultType(routeResult: ExerciseRouteResult): String = when (routeResult) {
        is ExerciseRouteResult.Data -> "Data"
        is ExerciseRouteResult.ConsentRequired -> "ConsentRequired"
        is ExerciseRouteResult.NoData -> "NoData"
        else -> routeResult::class.java.simpleName
    }

    private fun isHealthConnectAvailable(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
        return HealthConnectClient.getSdkStatus(reactContext) == HealthConnectClient.SDK_AVAILABLE
    }

    private fun healthConnectClientOrNull(): HealthConnectClient? {
        if (!isHealthConnectAvailable()) return null
        return try {
            HealthConnectClient.getOrCreate(reactContext)
        } catch (_: Exception) {
            null
        }
    }

    private fun permissionsFor(includeHistory: Boolean): Set<String> {
        return buildSet {
            addAll(basePermissions())
            if (includeHistory) add(PERMISSION_READ_HEALTH_DATA_HISTORY)
        }
    }

    private fun basePermissions(): Set<String> = setOf(
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(StepsCadenceRecord::class)
    )

    private fun toPermissionStatus(granted: Set<String>, expected: Set<String>): String {
        if (granted.containsAll(expected)) return "granted"
        if (granted.intersect(expected).isNotEmpty()) return "partial"
        return "denied"
    }

    private fun ReadableMap.booleanOrFalse(key: String): Boolean {
        return hasKey(key) && !isNull(key) && getBoolean(key)
    }

    private fun ReadableMap.doubleOrDefault(key: String, defaultValue: Double): Double {
        return if (hasKey(key) && !isNull(key)) getDouble(key) else defaultValue
    }

    private fun ReadableMap.intOrDefault(key: String, defaultValue: Int): Int {
        return if (hasKey(key) && !isNull(key)) getInt(key) else defaultValue
    }

    companion object {
        private const val MODULE_NAME = "RNHealthImportBridge"
        private const val REQUEST_HEALTH_PERMISSIONS = 29041
    }

    private data class RouteReadResult(
        val points: WritableArray,
        val status: String,
    )
}
