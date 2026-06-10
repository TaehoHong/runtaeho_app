package com.hongtaeho.app.health

import android.app.Activity
import android.content.Intent
import android.os.Build
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
        promise.resolve(isHealthConnectAvailable())
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
                promise.resolve(
                    toPermissionStatus(
                        granted,
                        permissionsFor(includeHistory = true, includeRoute = false)
                    )
                )
            } catch (_: Exception) {
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

        val permissions = permissionsFor(
            includeHistory = options.booleanOrFalse("includeHistory"),
            includeRoute = options.booleanOrFalse("includeRoute")
        )

        pendingPermissionPromise = promise
        pendingPermissionSet = permissions

        try {
            val intent = permissionContract.createIntent(activity, permissions)
            activity.startActivityForResult(intent, REQUEST_HEALTH_PERMISSIONS)
        } catch (error: Exception) {
            pendingPermissionPromise = null
            pendingPermissionSet = emptySet()
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

        scope.launch {
            try {
                val records = Arguments.createArray()
                var pageToken: String? = null

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

                    for (session in response.records) {
                        if (session.exerciseType != ExerciseSessionRecord.EXERCISE_TYPE_RUNNING) continue
                        records.pushMap(mapSession(client, session))
                    }
                    pageToken = response.pageToken
                } while (!pageToken.isNullOrBlank())

                promise.resolve(records)
            } catch (error: Exception) {
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
            promise.resolve(toPermissionStatus(granted, expectedPermissions))
        } catch (error: Exception) {
            promise.reject("health_permission_failed", error.message, error)
        }
    }

    override fun onNewIntent(intent: Intent) = Unit

    private suspend fun mapSession(
        client: HealthConnectClient,
        session: ExerciseSessionRecord
    ) = Arguments.createMap().apply {
        val distance = readDistance(client, session.startTime, session.endTime)
        val calorie = readCalories(client, session.startTime, session.endTime)
        val heartRate = readHeartRate(client, session.startTime, session.endTime)
        val cadence = readCadence(client, session.startTime, session.endTime)
        val gpsPoints = readExerciseRoute(client, session)
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
        putArray("gpsPoints", gpsPoints)
    }

    private fun mapExerciseRoute(routeResult: ExerciseRouteResult) = Arguments.createArray().apply {
        val route = (routeResult as? ExerciseRouteResult.Data)?.exerciseRoute?.route ?: return@apply

        route.forEach { location ->
            pushMap(Arguments.createMap().apply {
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
    }

    private suspend fun readExerciseRoute(
        client: HealthConnectClient,
        session: ExerciseSessionRecord
    ) = try {
        val routeResult = client.readRecord(ExerciseSessionRecord::class, session.metadata.id)
            .record
            .exerciseRouteResult
        mapExerciseRoute(routeResult)
    } catch (_: Exception) {
        mapExerciseRoute(session.exerciseRouteResult)
    }

    private suspend fun readDistance(client: HealthConnectClient, start: Instant, end: Instant): Double {
        return try {
            val result = client.aggregate(
                AggregateRequest(
                    metrics = setOf(DistanceRecord.DISTANCE_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )
            result[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0
        } catch (_: Exception) {
            0.0
        }
    }

    private suspend fun readCalories(client: HealthConnectClient, start: Instant, end: Instant): Double {
        return try {
            val result = client.aggregate(
                AggregateRequest(
                    metrics = setOf(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )
            result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0
        } catch (_: Exception) {
            0.0
        }
    }

    private suspend fun readHeartRate(client: HealthConnectClient, start: Instant, end: Instant): Double {
        return try {
            val result = client.aggregate(
                AggregateRequest(
                    metrics = setOf(HeartRateRecord.BPM_AVG),
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )
            result[HeartRateRecord.BPM_AVG]?.toDouble() ?: 0.0
        } catch (_: Exception) {
            0.0
        }
    }

    private suspend fun readCadence(client: HealthConnectClient, start: Instant, end: Instant): Double {
        return try {
            val result = client.aggregate(
                AggregateRequest(
                    metrics = setOf(StepsCadenceRecord.RATE_AVG),
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )
            result[StepsCadenceRecord.RATE_AVG] ?: 0.0
        } catch (_: Exception) {
            0.0
        }
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

    private fun permissionsFor(includeHistory: Boolean, includeRoute: Boolean): Set<String> {
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
}
