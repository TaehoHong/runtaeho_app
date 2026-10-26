package com.runtaeho.wear

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.*
import android.view.Gravity
import android.widget.*
import com.runtaeho.watchsync.WatchStore
import java.util.Locale

class RunActivity : Activity() {
    private lateinit var metrics: TextView
    private lateinit var status: TextView
    private lateinit var primary: Button
    private lateinit var end: Button
    private val handler = Handler(Looper.getMainLooper())
    private val store by lazy { WatchStore(this) }
    private val refresh = object : Runnable {
        override fun run() { render(); handler.postDelayed(this, 1000) }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Product PRIMARY.500/GREY.900/WHITE; native Views keep Wear runtime small.
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER
            setPadding(16, 16, 16, 16); setBackgroundColor(Color.rgb(32, 32, 32))
        }
        status = TextView(this).apply { setTextColor(Color.WHITE); gravity = Gravity.CENTER; textSize = 12f }
        metrics = TextView(this).apply { setTextColor(Color.WHITE); gravity = Gravity.CENTER; textSize = 20f }
        primary = Button(this).apply {
            setTextColor(Color.rgb(32, 32, 32)); backgroundTintList = android.content.res.ColorStateList.valueOf(Color.rgb(89, 236, 58))
            setOnClickListener {
                when (store.read("active")?.optString("state")) {
                    null -> requestStart()
                    "ACTIVE" -> send("PAUSE")
                    "PAUSED" -> send("RESUME")
                    else -> send("RECOVER")
                }
            }
        }
        end = Button(this).apply { text = "종료 및 저장"; setOnClickListener { send("END") } }
        layout.addView(status); layout.addView(metrics); layout.addView(primary); layout.addView(end)
        setContentView(ScrollView(this).apply { addView(layout) })
        WatchDataService.retry(this)
        if (store.read("active") != null && checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED)
            send("RECOVER")
    }
    override fun onResume() { super.onResume(); handler.post(refresh) }
    override fun onPause() { handler.removeCallbacks(refresh); super.onPause() }
    private fun requestStart() {
        val permissions = mutableListOf(Manifest.permission.ACTIVITY_RECOGNITION,
            Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION,
            if (Build.VERSION.SDK_INT >= 36) "android.permission.health.READ_HEART_RATE" else Manifest.permission.BODY_SENSORS)
        if (Build.VERSION.SDK_INT >= 33) permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        val missing = permissions.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isEmpty()) send("START") else requestPermissions(missing.toTypedArray(), 7)
    }
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 7) send("START")
    }
    private fun send(action: String) {
        try { startForegroundService(Intent(this, RunService::class.java).setAction(action)) }
        catch (_: Exception) { status.text = "앱 권한을 확인해 주세요" }
    }
    private fun render() {
        try {
            val run = store.read("active")
            val state = run?.optString("state")
            primary.text = when (state) { "ACTIVE" -> "일시 정지"; "PAUSED" -> "계속 달리기"; null -> "러닝 시작"; else -> "기록 복구" }
            primary.isEnabled = state != "STARTING" && state != "TRANSITION" && run?.optBoolean("requestPending") != true
            end.visibility = if (run == null) android.view.View.GONE else android.view.View.VISIBLE
            end.isEnabled = (state == "ACTIVE" || state == "PAUSED") && run?.optBoolean("requestPending") != true
            if (run == null) {
                metrics.text = "거리 -- km\n심박 -- · 페이스 --\n러닝 시간 00:00"
                status.text = store.read("status")?.optString("message") ?: "휴대폰에서 로그인 후 연결해 주세요"
                return
            }
            val duration = ActiveTime.milliseconds(run.optLong("durationMs"), run.optLong("checkpointTime"), System.currentTimeMillis(), state == "ACTIVE") / 1000
            val distance = if (run.has("distance")) run.getDouble("distance") else null
            val pace = distance?.takeIf { it > 0 && duration > 0 }?.let { (duration * 1000 / it).toLong() }
            val distanceLabel = distance?.let { String.format(Locale.getDefault(), "%.2f", it / 1000) } ?: "--"
            val paceLabel = pace?.let { String.format(Locale.getDefault(), "%d:%02d", it / 60, it % 60) } ?: "--"
            val heart = run.optInt("heartRateLatest").takeIf { it > 0 && run.optBoolean("heartRateAvailable") }?.toString() ?: "--"
            metrics.text = "거리 $distanceLabel km\n심박 $heart · 페이스 $paceLabel\n러닝 시간 " + String.format(Locale.getDefault(), "%d:%02d", duration / 60, duration % 60)
            status.text = when (state) { "PAUSED" -> "일시 정지됨"; "ACTIVE" -> if (run.optBoolean("gpsEnabled")) "러닝 기록 중" else "GPS 없음 · 센서 거리"; else -> store.read("status")?.optString("message") ?: "운동 상태 확인 중" }
        } catch (_: Exception) { status.text = "기록을 읽을 수 없습니다. 저장 공간을 확인해 주세요" }
    }
}
