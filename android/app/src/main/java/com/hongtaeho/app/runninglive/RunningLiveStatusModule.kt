package com.hongtaeho.app.runninglive

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.hongtaeho.app.MainActivity
import com.hongtaeho.app.R
import org.json.JSONObject
import java.lang.ref.WeakReference
import java.util.Locale
import java.util.UUID

class RunningLiveStatusModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val MODULE_NAME = "RunningLiveStatus"
    const val EVENT_COMMAND = "runningLiveStatusCommand"
    const val ACTION_PAUSE = "com.runtaeho.runtaeho.runninglive.PAUSE"
    const val ACTION_RESUME = "com.runtaeho.runtaeho.runninglive.RESUME"
    const val ACTION_STOP = "com.runtaeho.runtaeho.runninglive.STOP"

    private const val CHANNEL_ID = "running_live_status"
    private const val NOTIFICATION_ID = 48201
    private const val PREFS_NAME = "running_live_status"
    private const val PREF_PENDING_COMMAND = "pending_command"

    @Volatile
    private var instance: WeakReference<RunningLiveStatusModule>? = null

    fun storePendingCommand(context: Context, action: String): WritableMap {
      val commandAction = when (action) {
        ACTION_PAUSE -> "pause"
        ACTION_RESUME -> "resume"
        ACTION_STOP -> "stop"
        else -> "stop"
      }
      val command = JSONObject()
        .put("id", UUID.randomUUID().toString())
        .put("action", commandAction)
        .put("createdAtMs", System.currentTimeMillis())

      context
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(PREF_PENDING_COMMAND, command.toString())
        .apply()

      return command.toWritableMap()
    }

    fun emitCommandIfPossible(command: WritableMap): Boolean {
      val module = instance?.get() ?: return false
      if (!module.reactContext.hasActiveReactInstance()) return false

      module.reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(EVENT_COMMAND, command)
      return true
    }

    fun openApp(context: Context) {
      val intent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP
      }
      context.startActivity(intent)
    }

    private fun JSONObject.toWritableMap(): WritableMap {
      return Arguments.createMap().apply {
        putString("id", getString("id"))
        putString("action", getString("action"))
        putDouble("createdAtMs", getLong("createdAtMs").toDouble())
      }
    }
  }

  private var listenerCount = 0

  init {
    instance = WeakReference(this)
  }

  override fun getName(): String = MODULE_NAME

  @ReactMethod
  fun addListener(eventName: String) {
    listenerCount += 1
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    listenerCount = (listenerCount - count).coerceAtLeast(0)
  }

  @ReactMethod
  fun startLiveStatus(snapshot: ReadableMap, promise: Promise) {
    promise.resolve(showNotification(snapshot))
  }

  @ReactMethod
  fun updateLiveStatus(snapshot: ReadableMap, promise: Promise) {
    promise.resolve(showNotification(snapshot))
  }

  @ReactMethod
  fun endLiveStatus(promise: Promise) {
    val manager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.cancel(NOTIFICATION_ID)
    promise.resolve(true)
  }

  @ReactMethod
  fun getPendingCommand(promise: Promise) {
    val raw = reactContext
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(PREF_PENDING_COMMAND, null)

    if (raw == null) {
      promise.resolve(null)
      return
    }

    try {
      promise.resolve(JSONObject(raw).toWritableMap())
    } catch (error: Exception) {
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun clearPendingCommand(commandId: String, promise: Promise) {
    val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val raw = prefs.getString(PREF_PENDING_COMMAND, null)
    if (raw == null) {
      promise.resolve(true)
      return
    }

    val storedId = try {
      JSONObject(raw).getString("id")
    } catch (error: Exception) {
      null
    }

    if (storedId == null || storedId == commandId) {
      prefs.edit().remove(PREF_PENDING_COMMAND).apply()
    }
    promise.resolve(true)
  }

  private fun showNotification(snapshot: ReadableMap): Boolean {
    if (!canPostNotifications()) return false

    val manager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    ensureChannel(manager)
    manager.notify(NOTIFICATION_ID, buildNotification(snapshot))
    return true
  }

  private fun canPostNotifications(): Boolean {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
      ContextCompat.checkSelfPermission(
        reactContext,
        Manifest.permission.POST_NOTIFICATIONS
      ) == PackageManager.PERMISSION_GRANTED
  }

  private fun ensureChannel(manager: NotificationManager) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "러닝 실시간 현황",
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "러닝 중 거리, 시간, 페이스, 상태를 표시합니다."
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(snapshot: ReadableMap): Notification {
    val state = snapshot.getString("state") ?: "running"
    val contentIntent = PendingIntent.getActivity(
      reactContext,
      0,
      Intent(reactContext, MainActivity::class.java),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(reactContext, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(reactContext)
    }

    builder
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("러닝 중")
      .setContentText(buildContentText(snapshot))
      .setSubText(toStatusText(state))
      .setContentIntent(contentIntent)
      .setOngoing(state != "ending")
      .setOnlyAlertOnce(true)
      .setShowWhen(true)
      .setWhen(snapshot.getDouble("updatedAtMs").toLong())

    if (state == "paused") {
      builder.addAction(buildAction("재개", ACTION_RESUME, 1))
    } else if (state != "ending") {
      builder.addAction(buildAction("일시정지", ACTION_PAUSE, 2))
    }
    builder.addAction(buildAction("종료", ACTION_STOP, 3))

    return builder.build()
  }

  private fun buildAction(title: String, action: String, requestCode: Int): Notification.Action {
    val intent = Intent(reactContext, RunningLiveStatusReceiver::class.java).apply {
      this.action = action
      setPackage(reactContext.packageName)
    }
    val pendingIntent = PendingIntent.getBroadcast(
      reactContext,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    return Notification.Action.Builder(
      R.mipmap.ic_launcher,
      title,
      pendingIntent
    ).build()
  }

  private fun buildContentText(snapshot: ReadableMap): String {
    val distanceText = formatDistance(snapshot.getDouble("distanceMeters"))
    val elapsedText = formatElapsed(snapshot.getDouble("elapsedSec").toLong())
    val paceText = if (snapshot.isNull("paceSecPerKm")) {
      "--'--\""
    } else {
      formatPace(snapshot.getDouble("paceSecPerKm").toLong())
    }
    return "$distanceText · $elapsedText · $paceText"
  }

  private fun formatDistance(distanceMeters: Double): String {
    return String.format(Locale.US, "%.2f km", distanceMeters / 1000.0)
  }

  private fun formatElapsed(elapsedSec: Long): String {
    val hours = elapsedSec / 3600
    val minutes = (elapsedSec % 3600) / 60
    val seconds = elapsedSec % 60
    return if (hours > 0) {
      String.format(Locale.US, "%d:%02d:%02d", hours, minutes, seconds)
    } else {
      String.format(Locale.US, "%02d:%02d", minutes, seconds)
    }
  }

  private fun formatPace(paceSecPerKm: Long): String {
    val minutes = paceSecPerKm / 60
    val seconds = paceSecPerKm % 60
    return String.format(Locale.US, "%d'%02d\"", minutes, seconds)
  }

  private fun toStatusText(state: String): String {
    return when (state) {
      "paused" -> "일시정지"
      "ending" -> "종료 처리"
      else -> "진행 중"
    }
  }
}
