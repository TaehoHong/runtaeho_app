package com.runtaeho.wear

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.os.*
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.AbsoluteSizeSpan
import android.text.style.ForegroundColorSpan
import android.view.*
import android.widget.*
import com.runtaeho.watchsync.WatchStore
import org.json.JSONObject

class RunActivity : Activity() {
    private enum class Page { HOME, RUN, SETTINGS, UNITS, LAYOUT, PICKER }
    private var page = Page.HOME
    private var selectedSlot = 0
    private var displayedRun: JSONObject? = null
    private lateinit var preferences: RunDisplayPreferences
    private lateinit var content: LinearLayout
    private lateinit var status: TextView
    private var primary: Button? = null
    private var end: Button? = null
    private val tiles = mutableListOf<TextView>()
    private val handler = Handler(Looper.getMainLooper())
    private val store by lazy { WatchStore(this) }
    // Approved Figma colors; Roboto is Android's native sans-serif face.
    private val dark = Color.rgb(32, 32, 32)
    private val accent = Color.rgb(89, 236, 58)
    private val white = Color.rgb(248, 248, 248)
    private val muted = Color.rgb(180, 180, 180)
    private val surface = Color.argb(24, 248, 248, 248)
    private val scale get() = (resources.configuration.screenWidthDp / 240f).coerceIn(.8f, 1.3f)
    private val refresh = object : Runnable {
        override fun run() { refreshRecord(); handler.postDelayed(this, 1000) }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        preferences = RunDisplayPreferences(try { store.read("display-settings") } catch (_: Exception) { null })
        displayedRun = store.read("active")
        page = savedInstanceState?.getString("page")?.let { name -> Page.entries.find { it.name == name } }
            ?: if (displayedRun == null) Page.HOME else Page.RUN
        selectedSlot = savedInstanceState?.getInt("slot", 0)?.coerceIn(0, 3) ?: 0
        show(page)
        if (Build.VERSION.SDK_INT >= 33) onBackInvokedDispatcher.registerOnBackInvokedCallback(
            android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT) { navigateBack() }
        WatchDataService.retry(this)
        if (displayedRun != null && checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED)
            send("RECOVER")
    }
    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString("page", page.name); outState.putInt("slot", selectedSlot)
        super.onSaveInstanceState(outState)
    }
    override fun onResume() { super.onResume(); handler.post(refresh) }
    override fun onPause() { handler.removeCallbacks(refresh); super.onPause() }
    @SuppressLint("GestureBackNavigation") // API30-32 fallback; API33+ dispatcher registered above.
    @Deprecated("Legacy physical back support")
    override fun onBackPressed() { navigateBack() }
    private fun navigateBack() {
        when (page) {
            Page.PICKER -> show(Page.LAYOUT)
            Page.UNITS, Page.LAYOUT -> show(Page.SETTINGS)
            Page.SETTINGS -> show(if (displayedRun == null) Page.HOME else Page.RUN)
            else -> finish()
        }
    }
    private fun show(next: Page) {
        page = next; tiles.clear(); primary = null; end = null
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL
            val round = resources.configuration.isScreenRound
            setPadding(dp(if (round) 30f * scale else 16f), dp(if (next == Page.RUN) 8f else if (round) 24f * scale else 12f),
                dp(if (round) 30f * scale else 16f), dp(if (next == Page.RUN) 24f else if (round) 28f * scale else 16f))
        }
        val scroll = ScrollView(this).apply { setBackgroundColor(dark); isFillViewport = true; addView(content) }
        setContentView(scroll)
        status = text("", 11f, muted).apply { gravity = Gravity.CENTER; visibility = View.GONE }
        when (next) {
            Page.HOME -> home()
            Page.RUN -> running()
            Page.SETTINGS -> {
                header("설정") { show(if (displayedRun == null) Page.HOME else Page.RUN) }
                row("단위", preferences.unit) { show(Page.UNITS) }
                row("러닝 화면", "›") { show(Page.LAYOUT) }
            }
            Page.UNITS -> {
                header("단위") { show(Page.SETTINGS) }
                unitOption("KPH", "km · min/km · km/h")
                unitOption("MPH", "mi · min/mi · mph")
            }
            Page.LAYOUT -> {
                header("러닝 화면") { show(Page.SETTINGS) }
                metricTiles(true)
            }
            Page.PICKER -> picker()
        }
        if (next == Page.RUN || next == Page.HOME) content.addView(status)
        renderMetrics()
        if (next == Page.RUN || next == Page.LAYOUT) content.post { renderMetrics() }
    }
    private fun home() {
        content.gravity = Gravity.CENTER
        content.addView(text("야외 러닝", 18f, white), params(48))
        primary = button("▶ 시작", true) { requestStart() }.also {
            content.addView(it, params(48).apply { topMargin = dp(8f) })
        }
        content.addView(ImageButton(this).apply {
            setImageResource(android.R.drawable.ic_menu_preferences)
            imageTintList = android.content.res.ColorStateList.valueOf(white)
            background = rounded(surface); setPadding(dp(12f), dp(12f), dp(12f), dp(12f))
            contentDescription = "설정"; setOnClickListener { show(Page.SETTINGS) }
        },
            LinearLayout.LayoutParams(dp(48f), dp(48f)).apply { topMargin = dp(4f) })
    }
    private fun running() {
        metricTiles(false)
        val controls = LinearLayout(this).apply { gravity = Gravity.CENTER }
        primary = button("Ⅱ", true) {
            when (displayedRun?.optString("state")) {
                "ACTIVE" -> send("PAUSE")
                "PAUSED" -> send("RESUME")
                else -> send("RECOVER")
            }
        }.apply { textSize = 22f }
        end = button("종료", false) { send("END") }.apply { textSize = 12f }
        controls.addView(primary, LinearLayout.LayoutParams(0, dp(48f), 1f).apply { marginEnd = dp(8f) })
        controls.addView(end, LinearLayout.LayoutParams(dp(52f), dp(48f)))
        content.addView(controls, params(48).apply {
            topMargin = dp(4f)
            if (resources.configuration.isScreenRound) width = dp((resources.configuration.screenWidthDp - 60f * scale) * .8f)
        })
    }
    private fun metricTiles(editing: Boolean) {
        for (slot in 0..1) content.addView(metricTile(slot, editing), params(if (slot == 0) (60 * scale).toInt().coerceAtLeast(48) else (48 * scale).toInt().coerceAtLeast(48)))
        val bottom = LinearLayout(this).apply { gravity = Gravity.CENTER }
        bottom.addView(metricTile(2, editing), LinearLayout.LayoutParams(0, dp((48f * scale).coerceAtLeast(48f)), 1f))
        bottom.addView(metricTile(3, editing), LinearLayout.LayoutParams(0, dp((48f * scale).coerceAtLeast(48f)), 1f))
        content.addView(bottom)
    }
    private fun metricTile(slot: Int, editing: Boolean): TextView = text("", 20f, white).apply {
        gravity = Gravity.CENTER; isClickable = true; isFocusable = true
        minHeight = dp(48f)
        if (editing) background = rounded(surface, muted)
        setOnClickListener {
            if (editing) { selectedSlot = slot; show(Page.PICKER) }
            else if (updatePreferences { preferences.cycle(slot); true }) {
                performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                background = rounded(Color.argb(35, 89, 236, 58), accent)
                handler.postDelayed({ if (!isFinishing) background = null }, 220)
                renderMetrics()
            }
        }
        tiles.add(this)
    }
    private fun picker() {
        content.addView(SlotPreview(this, selectedSlot, accent, muted), LinearLayout.LayoutParams(dp(32f), dp(24f)))
        header("전환할 지표") { show(Page.LAYOUT) }
        val checks = mutableListOf<Pair<String, CheckBox>>()
        RunDisplayPreferences.labels.forEach { (id, label) ->
            val check = CheckBox(this).apply {
                text = label; textSize = 14f; typeface = Typeface.create("sans-serif", Typeface.NORMAL)
                setTextColor(white); gravity = Gravity.CENTER_VERTICAL
                isChecked = id in preferences.selected(selectedSlot)
                buttonTintList = android.content.res.ColorStateList(arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()), intArrayOf(accent, muted))
                background = rounded(if (isChecked) Color.argb(30, 89, 236, 58) else surface)
                setPadding(dp(8f), 0, dp(8f), 0)
                setOnClickListener {
                    if (!updatePreferences { preferences.toggle(selectedSlot, id) }) {
                        isChecked = id in preferences.selected(selectedSlot)
                        Toast.makeText(this@RunActivity, "지표는 1~3개 선택해 주세요", Toast.LENGTH_SHORT).show()
                    }
                    checks.forEach { (metric, view) ->
                        view.isChecked = metric in preferences.selected(selectedSlot)
                        view.background = rounded(if (view.isChecked) Color.argb(30, 89, 236, 58) else surface)
                    }
                }
            }
            checks.add(id to check)
            content.addView(check, params(48).apply { topMargin = dp(4f) })
        }
    }
    private fun unitOption(unit: String, description: String) {
        val chosen = preferences.unit == unit
        val label = "$unit${if (chosen) "  ✓" else ""}\n$description"
        content.addView(button(label, chosen) {
            if (updatePreferences { preferences.setUnit(unit); true }) show(Page.UNITS)
        }.apply { textSize = 12f }, params(56).apply { topMargin = dp(6f) })
    }
    private fun header(title: String, back: () -> Unit) {
        val header = FrameLayout(this)
        header.addView(text(title, 14f, white), FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, dp(48f)))
        header.addView(button("‹", false, back).apply { contentDescription = "뒤로"; background = null },
            FrameLayout.LayoutParams(dp(48f), dp(48f), Gravity.START))
        content.addView(header, params(48))
    }
    private fun row(label: String, value: String, action: () -> Unit) {
        content.addView(button("$label    $value", false, action).apply { textSize = 14f }, params(48).apply { topMargin = dp(6f) })
    }
    private fun updatePreferences(change: () -> Boolean): Boolean {
        val previous = preferences.toJson()
        if (!change()) return false
        return try { store.write("display-settings", preferences.toJson()); true }
        catch (_: Exception) {
            preferences = RunDisplayPreferences(previous)
            Toast.makeText(this, "설정을 저장하지 못했습니다", Toast.LENGTH_SHORT).show(); false
        }
    }
    private fun refreshRecord() {
        try {
            displayedRun = store.read("active")
            if (page == Page.HOME && displayedRun != null) show(Page.RUN)
            else if (page == Page.RUN && displayedRun == null) show(Page.HOME)
            renderMetrics()
        } catch (_: Exception) { status.text = "기록을 읽을 수 없습니다"; status.visibility = View.VISIBLE }
    }
    private fun renderMetrics() {
        if (page == Page.RUN || page == Page.LAYOUT) {
            val now = System.currentTimeMillis()
            val record = if (page == Page.LAYOUT) previewRecord(now) else displayedRun
            tiles.forEachIndexed { slot, view ->
                val metric = preferences.active(slot)
                val value = RunMetricDisplay.value(metric, record, preferences.unit, now)
                val label = if (slot == 0 || metric == "currentPace" || metric == "averagePace") value.label + "\n" else ""
                val preferredSize = when (slot) { 0 -> 38f; 1 -> 26f; else -> 20f } * scale
                val unitText = if (value.unit.isEmpty()) "" else " ${value.unit}"
                val measuringPaint = Paint(view.paint)
                measuringPaint.textSize = android.util.TypedValue.applyDimension(android.util.TypedValue.COMPLEX_UNIT_SP, preferredSize, resources.displayMetrics)
                val numberWidth = measuringPaint.measureText(value.number)
                measuringPaint.textSize = android.util.TypedValue.applyDimension(android.util.TypedValue.COMPLEX_UNIT_SP, 10f, resources.displayMetrics)
                val unitWidth = measuringPaint.measureText(unitText)
                val estimatedWidth = resources.configuration.screenWidthDp - if (resources.configuration.isScreenRound) 60f * scale else 32f
                val available = (view.width.takeIf { it > 0 } ?: dp(estimatedWidth / if (slot >= 2) 2 else 1)) - dp(2f)
                val fit = MetricLineFit.scale(numberWidth, unitWidth, available.toFloat())
                val numberSize = (preferredSize * fit).toInt().coerceAtLeast(1)
                val unitSize = (10f * fit).toInt().coerceAtLeast(1)
                val display = SpannableStringBuilder(label + value.number + unitText)
                if (label.isNotEmpty()) {
                    display.setSpan(textSpan(10f), 0, label.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    display.setSpan(ForegroundColorSpan(muted), 0, label.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
                display.setSpan(textSpan(numberSize.toFloat()), label.length, label.length + value.number.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                if (value.unit.isNotEmpty()) display.setSpan(textSpan(unitSize.toFloat()), label.length + value.number.length, display.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                view.maxLines = if (label.isEmpty()) 1 else 2
                view.text = display
                view.contentDescription = "${value.label} ${value.number} ${value.unit}" + if (page == Page.LAYOUT) " 설정" else " 다음 지표로 전환"
            }
        }
        if (page == Page.RUN) {
            val state = displayedRun?.optString("state")
            val busy = displayedRun?.optBoolean("requestPending") == true
            primary?.apply {
                text = if (state == "PAUSED") "▶" else if (state == "ACTIVE") "Ⅱ" else "↻"
                contentDescription = when (state) { "PAUSED" -> "계속 달리기"; "ACTIVE" -> "일시 정지"; else -> "기록 복구" }
                isEnabled = !busy && state != "STARTING" && state != "TRANSITION"
            }
            end?.isEnabled = !busy && (state == "ACTIVE" || state == "PAUSED")
            status.text = when (state) { "PAUSED" -> "일시 정지됨"; "ACTIVE" -> if (displayedRun?.optBoolean("gpsEnabled") == false) "GPS 없음" else ""; else -> "운동 상태 확인 중" }
            status.visibility = if (status.text.isEmpty()) View.GONE else View.VISIBLE
        } else if (page == Page.HOME) {
            status.text = store.read("status")?.optString("message") ?: ""
            status.visibility = if (status.text.isEmpty()) View.GONE else View.VISIBLE
        }
    }
    private fun previewRecord(now: Long) = JSONObject().put("state", "ACTIVE").put("distance", 4280)
        .put("durationMs", 1404000).put("checkpointTime", now).put("speed", 1000.0 / 528)
        .put("speedAvailable", true).put("speedSampleEpochMs", now).put("heartRateLatest", 148)
        .put("heartRateAvailable", true).put("heartRateSampleEpochMs", now).put("cadenceLatest", 172)
        .put("cadenceAvailable", true).put("cadenceSampleEpochMs", now).put("calorie", 284)
    private fun textSpan(size: Float) = AbsoluteSizeSpan(android.util.TypedValue.applyDimension(
        android.util.TypedValue.COMPLEX_UNIT_SP, size, resources.displayMetrics).toInt())
    private fun text(label: String, size: Float, color: Int) = TextView(this).apply {
        text = label; textSize = size; setTextColor(color); gravity = Gravity.CENTER
        typeface = Typeface.create("sans-serif", Typeface.NORMAL); includeFontPadding = false
    }
    private fun button(label: String, green: Boolean, action: () -> Unit) = Button(this).apply {
        text = label; textSize = 14f; isAllCaps = false; minHeight = dp(48f); minimumHeight = dp(48f)
        setPadding(dp(8f), 0, dp(8f), 0); setTextColor(if (green) dark else white)
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        background = rounded(if (green) accent else surface)
        setOnClickListener { action() }
    }
    private fun rounded(fill: Int, stroke: Int? = null) = GradientDrawable().apply {
        setColor(fill); cornerRadius = dp(16f).toFloat(); stroke?.let { setStroke(dp(1f), it) }
    }
    private fun params(height: Int) = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(height.toFloat()))
    private fun dp(value: Float) = (value * resources.displayMetrics.density).toInt()
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
        catch (_: Exception) { status.text = "앱 권한을 확인해 주세요"; status.visibility = View.VISIBLE }
    }
    private class SlotPreview(context: android.content.Context, private val selected: Int,
                              private val accent: Int, private val muted: Int) : View(context) {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        init {
            importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES
            contentDescription = "${selected + 1}번째 지표 칸 선택"
        }
        override fun onDraw(canvas: Canvas) {
            val w = width.toFloat(); val h = height.toFloat(); val gap = w / 16
            val cells = arrayOf(RectF(gap, gap, w - gap, h / 3 - gap),
                RectF(gap, h / 3 + gap, w - gap, h * 2 / 3 - gap),
                RectF(gap, h * 2 / 3 + gap, w / 2 - gap, h - gap),
                RectF(w / 2 + gap, h * 2 / 3 + gap, w - gap, h - gap))
            cells.forEachIndexed { index, cell ->
                paint.color = if (index == selected) accent else muted
                paint.style = if (index == selected) Paint.Style.FILL else Paint.Style.STROKE
                paint.strokeWidth = resources.displayMetrics.density
                canvas.drawRoundRect(cell, gap / 2, gap / 2, paint)
            }
        }
    }
}
