package com.hongtaeho.app.unity

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.PixelCopy
import android.view.SurfaceView
import android.view.View
import android.view.ViewGroup
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.lang.ref.WeakReference
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.abs

/**
 * React Native Unity Bridge Module
 * React Native와 Unity 간의 통신을 담당하는 네이티브 모듈
 * iOS의 RNUnityBridge.swift와 동일한 기능 제공
 *
 * Architecture: Push + Pull Pattern
 * - Push: 이벤트 발생 시 즉시 알림 (리스너 있을 때)
 * - Pull: 언제든 현재 상태 조회 가능
 * - Buffer: 리스너 없을 때 이벤트 보관 후 나중에 발송
 */
class RNUnityBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    LifecycleEventListener {

    companion object {
        private const val TAG = "RNUnityBridge"
        const val MODULE_NAME = "RNUnityBridge"

        // Event names
        private const val EVENT_ON_UNITY_ERROR = "onUnityError"
        private const val EVENT_ON_CHARACTOR_READY = "onCharactorReady"
        private const val EVENT_ON_AVATAR_READY = "onAvatarReady"

        // Timeout constants
        private const val AVATAR_TIMEOUT_MS: Long = 5000
        private const val CAPTURE_TIMEOUT_MS: Long = 5000

        // 싱글톤 참조 (콜백에서 접근 가능하도록)
        @Volatile
        private var instance: WeakReference<RNUnityBridgeModule>? = null

        /**
         * 현재 인스턴스 가져오기
         * UnityNativeBridge에서 콜백 처리 시 사용
         */
        fun getInstance(): RNUnityBridgeModule? = instance?.get()
    }

    // MARK: - State

    /** 리스너 등록 여부 */
    @Volatile
    private var hasListeners: Boolean = false

    /** 리스너 등록 전 대기 중인 이벤트들 */
    private val pendingEvents = mutableListOf<WritableMap>()

    /** 동기화 락 */
    private val eventsLock = Any()

    // MARK: - Promise-based Avatar Change

    /** 아바타 변경 대기 중인 Promise */
    @Volatile
    private var pendingAvatarResolve: Promise? = null

    /** 아바타 타임아웃 핸들러 */
    private var avatarTimeoutHandler: Handler? = null

    /** 아바타 Promise 락 */
    private val avatarLock = Any()

    // MARK: - Promise-based Character Capture

    /** 캐릭터 캡처 대기 중인 콜백들 (callbackId -> Promise) */
    private val pendingCaptureCallbacks = mutableMapOf<String, Promise>()

    /** 캡처 콜백 락 */
    private val captureLock = Any()

    /** Main Thread Handler */
    private val mainHandler = Handler(Looper.getMainLooper())

    init {
        // 싱글톤 인스턴스 설정
        instance = WeakReference(this)

        // Lifecycle 리스너 등록
        reactContext.addLifecycleEventListener(this)

        // UnityHolder에 콜백 리스너 등록
        UnityHolder.onCharactorReadyListener = {
            handleCharactorReady()
        }

        // UnityHolder에 Avatar Ready 콜백 리스너 등록
        UnityHolder.onAvatarReadyListener = {
            handleAvatarReadyCallback()
        }

        Log.d(TAG, "RNUnityBridgeModule initialized")
    }

    override fun getName(): String = MODULE_NAME

    // MARK: - React Native Event Emitter

    /**
     * 지원하는 이벤트 목록 반환
     * RCTEventEmitter 패턴에 필요
     */
    private fun getSupportedEvents(): List<String> {
        return listOf(EVENT_ON_UNITY_ERROR, EVENT_ON_CHARACTOR_READY, EVENT_ON_AVATAR_READY)
    }

    /**
     * 리스너 등록 시 호출됨 (JS에서 addListener 호출 시)
     * iOS의 startObserving()과 동일
     */
    @ReactMethod
    fun addListener(eventName: String) {
        Log.d(TAG, "addListener: $eventName")

        if (!hasListeners) {
            hasListeners = true
            Log.d(TAG, "Listeners started, pending events: ${pendingEvents.size}")

            // 대기 중인 이벤트 발송
            flushPendingEvents()
        }
    }

    /**
     * 리스너 해제 시 호출됨 (JS에서 removeListeners 호출 시)
     * iOS의 stopObserving()과 동일
     */
    @ReactMethod
    fun removeListeners(count: Int) {
        Log.d(TAG, "removeListeners: $count")

        // 모든 리스너가 제거되면 hasListeners를 false로 설정
        if (count == 0) {
            hasListeners = false
            Log.d(TAG, "Listeners stopped")
        }
    }

    // MARK: - Event Handling

    /**
     * Charactor Ready 이벤트 처리
     * UnityHolder에서 콜백으로 호출됨
     */
    private fun handleCharactorReady() {
        Log.d(TAG, "handleCharactorReady() called")

        val eventBody = Arguments.createMap().apply {
            putBoolean("ready", true)
            putString("timestamp", getISO8601Timestamp())
        }

        synchronized(eventsLock) {
            if (hasListeners) {
                Log.d(TAG, "Sending onCharactorReady event immediately")
                sendEvent(EVENT_ON_CHARACTOR_READY, eventBody)
            } else {
                Log.d(TAG, "Buffering onCharactorReady event (no listeners)")
                pendingEvents.add(eventBody)
            }
        }
    }

    /**
     * Avatar Ready 이벤트 처리 (이벤트 방식)
     * UnityHolder에서 콜백으로 호출됨
     */
    private fun handleAvatarReady() {
        Log.d(TAG, "handleAvatarReady() called")

        val eventBody = Arguments.createMap().apply {
            putBoolean("ready", true)
            putString("timestamp", getISO8601Timestamp())
        }

        synchronized(eventsLock) {
            if (hasListeners) {
                Log.d(TAG, "Sending onAvatarReady event immediately")
                sendEvent(EVENT_ON_AVATAR_READY, eventBody)
            } else {
                Log.d(TAG, "No listeners for onAvatarReady")
            }
        }
    }

    /**
     * Avatar Ready 콜백 처리 (Promise 방식)
     * changeAvatarAndWait의 Promise를 resolve함
     */
    private fun handleAvatarReadyCallback() {
        Log.d(TAG, "handleAvatarReadyCallback() called")

        // 이벤트 방식도 함께 호출
        handleAvatarReady()

        // Promise 방식 처리
        synchronized(avatarLock) {
            avatarTimeoutHandler?.removeCallbacksAndMessages(null)
            avatarTimeoutHandler = null

            pendingAvatarResolve?.let { promise ->
                Log.d(TAG, "Resolving pending avatar promise with true")
                promise.resolve(true)
            }
            pendingAvatarResolve = null
        }
    }

    /**
     * 캐릭터 이미지 캡처 완료 콜백
     * Unity에서 캡처 완료 시 UnityNativeBridge를 통해 호출됨
     *
     * @param callbackId 요청 시 전달한 콜백 ID
     * @param base64Image Base64 인코딩된 이미지 데이터
     */
    fun handleCharacterImageCaptured(callbackId: String, base64Image: String) {
        Log.d(TAG, "handleCharacterImageCaptured() called with callbackId: $callbackId")

        synchronized(captureLock) {
            val promise = pendingCaptureCallbacks.remove(callbackId)
            if (promise != null) {
                Log.d(TAG, "Resolving capture promise for callbackId: $callbackId")
                promise.resolve(base64Image)
            } else {
                Log.w(TAG, "No pending capture callback found for callbackId: $callbackId")
            }
        }
    }

    /**
     * 대기 중인 이벤트 발송
     */
    private fun flushPendingEvents() {
        synchronized(eventsLock) {
            if (pendingEvents.isEmpty()) return

            Log.d(TAG, "Flushing ${pendingEvents.size} pending events")

            pendingEvents.forEach { event ->
                Log.d(TAG, "Flushing buffered event")
                sendEvent(EVENT_ON_CHARACTOR_READY, event)
            }

            pendingEvents.clear()
        }
    }

    // MARK: - State Query (Pull Pattern)

    /**
     * Charactor Ready 상태 조회
     * iOS의 isCharactorReady와 동일
     *
     * @param promise React Native Promise
     */
    @ReactMethod
    fun isCharactorReady(promise: Promise) {
        val isReady = UnityHolder.isCharactorReady
        Log.d(TAG, "isCharactorReady: $isReady")
        promise.resolve(isReady)
    }

    /**
     * Ready 상태 리셋
     * iOS의 resetCharactorReady와 동일
     *
     * @param promise React Native Promise
     */
    @ReactMethod
    fun resetCharactorReady(promise: Promise) {
        Log.d(TAG, "resetCharactorReady()")

        try {
            // 상태 리셋
            UnityHolder.resetCharactorReady()

            // 대기 중인 이벤트 클리어
            synchronized(eventsLock) {
                pendingEvents.clear()
            }

            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error resetting charactor ready: ${e.message}", e)
            promise.reject("RESET_ERROR", "Failed to reset charactor ready state", e)
        }
    }

    // MARK: - Unity State Validation

    /**
     * Unity 상태 유효성 검사
     * iOS의 validateUnityState와 동일
     * 앱 업데이트 후 stale 상태 감지에 사용
     *
     * @param promise React Native Promise (Boolean 반환)
     */
    @ReactMethod
    fun validateUnityState(promise: Promise) {
        val isValid = UnityHolder.validateState()
        Log.d(TAG, "validateUnityState: $isValid")
        promise.resolve(isValid)
    }

    /**
     * Unity 강제 리셋 (stale 상태 복구용)
     * iOS의 forceResetUnity와 동일
     *
     * @param promise React Native Promise
     */
    @ReactMethod
    fun forceResetUnity(promise: Promise) {
        Log.d(TAG, "🔄 Force reset requested")
        try {
            UnityHolder.forceReset()

            // Bridge 상태도 리셋
            synchronized(eventsLock) {
                pendingEvents.clear()
            }

            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Force reset failed: ${e.message}", e)
            promise.reject("RESET_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCaptureRootBounds(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("CAPTURE_ROOT_ERROR", "Current activity is null")
            return
        }

        activity.runOnUiThread {
            try {
                val contentRoot = activity.findViewById<View>(android.R.id.content)
                if (contentRoot == null) {
                    promise.reject("CAPTURE_ROOT_ERROR", "Android content root is not available")
                    return@runOnUiThread
                }

                val width = contentRoot.width
                val height = contentRoot.height
                if (width <= 0 || height <= 0) {
                    promise.reject(
                        "CAPTURE_ROOT_ERROR",
                        "Android content root bounds are invalid: ${width}x${height}"
                    )
                    return@runOnUiThread
                }

                val location = IntArray(2)
                contentRoot.getLocationInWindow(location)

                val result = Arguments.createMap().apply {
                    putDouble("x", location[0].toDouble())
                    putDouble("y", location[1].toDouble())
                    putDouble("width", width.toDouble())
                    putDouble("height", height.toDouble())
                }

                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "getCaptureRootBounds error: ${e.message}", e)
                promise.reject("CAPTURE_ROOT_ERROR", "Failed to resolve Android content root bounds", e)
            }
        }
    }

    @ReactMethod
    fun cropAndResizeImage(
        sourceUri: String,
        originX: Double,
        originY: Double,
        width: Double,
        height: Double,
        targetWidth: Double,
        targetHeight: Double,
        promise: Promise
    ) {
        try {
            val sourceBitmap = decodeBitmapFromUri(sourceUri)
            val cropX = originX.toInt()
            val cropY = originY.toInt()
            val cropWidth = width.toInt()
            val cropHeight = height.toInt()

            if (
                cropX < 0 ||
                cropY < 0 ||
                cropWidth <= 0 ||
                cropHeight <= 0 ||
                cropX + cropWidth > sourceBitmap.width ||
                cropY + cropHeight > sourceBitmap.height
            ) {
                promise.reject(
                    "IMAGE_EXPORT_ERROR",
                    "Crop rect is out of bounds: (${cropX}, ${cropY}, ${cropWidth}, ${cropHeight}) in ${sourceBitmap.width}x${sourceBitmap.height}"
                )
                return
            }

            val croppedBitmap = Bitmap.createBitmap(sourceBitmap, cropX, cropY, cropWidth, cropHeight)
            val shouldResize = targetWidth > 0 && targetHeight > 0
            val outputBitmap = if (shouldResize) {
                Bitmap.createScaledBitmap(
                    croppedBitmap,
                    targetWidth.toInt(),
                    targetHeight.toInt(),
                    true
                )
            } else {
                croppedBitmap
            }

            val outputFile = saveBitmapToShareExport(outputBitmap)

            val result = Arguments.createMap().apply {
                putString("uri", Uri.fromFile(outputFile).toString())
                putDouble("width", outputBitmap.width.toDouble())
                putDouble("height", outputBitmap.height.toDouble())
            }

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "cropAndResizeImage error: ${e.message}", e)
            promise.reject("IMAGE_EXPORT_ERROR", "Failed to crop and resize image", e)
        }
    }

    @ReactMethod
    fun annotateImageRect(
        sourceUri: String,
        originX: Double,
        originY: Double,
        width: Double,
        height: Double,
        colorHex: String,
        promise: Promise
    ) {
        try {
            val sourceBitmap = decodeBitmapFromUri(sourceUri)
            val mutableBitmap = sourceBitmap.copy(Bitmap.Config.ARGB_8888, true)
            val canvas = Canvas(mutableBitmap)
            val strokeWidth = maxOf(4f, mutableBitmap.width / 120f)
            val strokeInset = strokeWidth / 2f
            val rectPaint = Paint().apply {
                style = Paint.Style.STROKE
                color = Color.parseColor(colorHex)
                this.strokeWidth = strokeWidth
                isAntiAlias = true
            }

            canvas.drawRect(
                originX.toFloat() + strokeInset,
                originY.toFloat() + strokeInset,
                (originX + width).toFloat() - strokeInset,
                (originY + height).toFloat() - strokeInset,
                rectPaint
            )

            val outputFile = saveBitmapToShareExport(mutableBitmap)
            val result = Arguments.createMap().apply {
                putString("uri", Uri.fromFile(outputFile).toString())
                putDouble("width", mutableBitmap.width.toDouble())
                putDouble("height", mutableBitmap.height.toDouble())
            }

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "annotateImageRect error: ${e.message}", e)
            promise.reject("IMAGE_ANNOTATION_ERROR", "Failed to annotate image rect", e)
        }
    }

    @ReactMethod
    fun composeDebugComparison(
        afterUri: String,
        beforeUri: String,
        skipUri: String,
        overlayUri: String,
        promise: Promise
    ) {
        try {
            val panels = listOf(
                "after" to decodeBitmapFromUri(afterUri),
                "before" to decodeBitmapFromUri(beforeUri),
                "skip" to decodeBitmapFromUri(skipUri),
                "overlay-only" to decodeBitmapFromUri(overlayUri),
            )
            val contentWidth = panels.maxOf { (_, bitmap) -> bitmap.width }
            val outerPadding = maxOf(24, contentWidth / 24)
            val sectionGap = maxOf(18, contentWidth / 40)
            val labelGap = maxOf(10, contentWidth / 72)
            val labelTextSize = maxOf(20f, contentWidth / 24f)
            val labelMetricsPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#111827")
                textSize = labelTextSize
                isFakeBoldText = true
            }
            val labelHeights = panels.map { (label, _) ->
                val metrics = labelMetricsPaint.fontMetrics
                kotlin.math.ceil((metrics.descent - metrics.ascent).toDouble()).toInt()
            }
            val totalHeight = outerPadding +
                panels.indices.sumOf { index ->
                    labelHeights[index] + labelGap + panels[index].second.height + sectionGap
                } - sectionGap +
                outerPadding

            val outputBitmap = Bitmap.createBitmap(
                contentWidth + outerPadding * 2,
                totalHeight,
                Bitmap.Config.ARGB_8888
            )
            val canvas = Canvas(outputBitmap)
            canvas.drawColor(Color.WHITE)

            val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#111827")
                textSize = labelTextSize
                isFakeBoldText = true
            }
            val separatorPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#E5E7EB")
                strokeWidth = maxOf(2f, contentWidth / 360f)
            }

            var cursorY = outerPadding.toFloat()
            panels.forEachIndexed { index, (label, bitmap) ->
                val labelBaseline = cursorY - labelPaint.fontMetrics.ascent
                canvas.drawText(label, outerPadding.toFloat(), labelBaseline, labelPaint)
                cursorY = labelBaseline + labelPaint.fontMetrics.descent + labelGap

                val bitmapLeft = outerPadding + (contentWidth - bitmap.width) / 2f
                canvas.drawBitmap(bitmap, bitmapLeft, cursorY, null)
                cursorY += bitmap.height.toFloat()

                if (index < panels.lastIndex) {
                    val separatorY = cursorY + sectionGap / 2f
                    canvas.drawLine(
                        outerPadding.toFloat(),
                        separatorY,
                        (outerPadding + contentWidth).toFloat(),
                        separatorY,
                        separatorPaint
                    )
                }

                cursorY += sectionGap
            }

            val outputFile = saveBitmapToShareExport(outputBitmap)
            panels.forEach { (_, bitmap) ->
                if (!bitmap.isRecycled) {
                    bitmap.recycle()
                }
            }
            if (!outputBitmap.isRecycled) {
                outputBitmap.recycle()
            }

            val result = Arguments.createMap().apply {
                putString("uri", Uri.fromFile(outputFile).toString())
                putDouble("width", (contentWidth + outerPadding * 2).toDouble())
                putDouble("height", totalHeight.toDouble())
            }

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "composeDebugComparison error: ${e.message}", e)
            promise.reject("IMAGE_COMPARISON_ERROR", "Failed to compose debug comparison image", e)
        }
    }

    @ReactMethod
    fun composeShareExportFromUnityAndOverlay(
        overlayUri: String,
        targetWidth: Double,
        targetHeight: Double,
        promise: Promise
    ) {
        val outputWidth = targetWidth.toInt()
        val outputHeight = targetHeight.toInt()
        if (outputWidth <= 0 || outputHeight <= 0) {
            promise.reject(
                "IMAGE_EXPORT_ERROR",
                "Target export size is invalid: ${outputWidth}x${outputHeight}"
            )
            return
        }

        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("IMAGE_EXPORT_ERROR", "Current activity is null")
            return
        }

        activity.runOnUiThread {
            try {
                val unityRootView = UnityHolder.getUnityView()
                if (unityRootView == null) {
                    promise.reject("IMAGE_EXPORT_ERROR", "Unity root view is not available")
                    return@runOnUiThread
                }

                val unityContainer = unityRootView.parent as? ViewGroup
                if (unityContainer == null) {
                    promise.reject("IMAGE_EXPORT_ERROR", "Unity container is not available")
                    return@runOnUiThread
                }

                if (unityContainer.width <= 0 || unityContainer.height <= 0) {
                    promise.reject(
                        "IMAGE_EXPORT_ERROR",
                        "Unity container size is invalid: ${unityContainer.width}x${unityContainer.height}"
                    )
                    return@runOnUiThread
                }

                val unitySurfaceView = findFirstSurfaceView(unityRootView)
                if (unitySurfaceView == null) {
                    promise.reject("IMAGE_EXPORT_ERROR", "Unity SurfaceView is not available")
                    return@runOnUiThread
                }

                if (unitySurfaceView.width <= 0 || unitySurfaceView.height <= 0) {
                    promise.reject(
                        "IMAGE_EXPORT_ERROR",
                        "Unity SurfaceView size is invalid: ${unitySurfaceView.width}x${unitySurfaceView.height}"
                    )
                    return@runOnUiThread
                }

                val unitySurfaceBounds = calculateDescendantBoundsRelativeToAncestor(
                    unitySurfaceView,
                    unityContainer
                )
                val unityBitmap = Bitmap.createBitmap(
                    unitySurfaceView.width,
                    unitySurfaceView.height,
                    Bitmap.Config.ARGB_8888
                )

                Log.d(
                    TAG,
                    "composeShareExportFromUnityAndOverlay: container=${unityContainer.width}x${unityContainer.height}, " +
                        "surfaceBounds=$unitySurfaceBounds, output=${outputWidth}x${outputHeight}"
                )

                PixelCopy.request(unitySurfaceView, unityBitmap, { copyResult ->
                    if (copyResult != PixelCopy.SUCCESS) {
                        if (!unityBitmap.isRecycled) {
                            unityBitmap.recycle()
                        }
                        promise.reject(
                            "IMAGE_EXPORT_ERROR",
                            "Failed to capture Unity SurfaceView: PixelCopy result=$copyResult"
                        )
                        return@request
                    }

                    try {
                        val overlayBitmap = decodeBitmapFromUri(overlayUri)
                        val outputBitmap = Bitmap.createBitmap(
                            outputWidth,
                            outputHeight,
                            Bitmap.Config.ARGB_8888
                        )
                        val canvas = Canvas(outputBitmap)
                        canvas.drawColor(Color.TRANSPARENT)

                        val bitmapPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                            isFilterBitmap = true
                            isDither = true
                        }

                        val scaleX = outputWidth.toFloat() / unityContainer.width.toFloat()
                        val scaleY = outputHeight.toFloat() / unityContainer.height.toFloat()
                        val unityDestRect = RectF(
                            unitySurfaceBounds.left * scaleX,
                            unitySurfaceBounds.top * scaleY,
                            unitySurfaceBounds.right * scaleX,
                            unitySurfaceBounds.bottom * scaleY
                        )
                        val overlayDestRect = RectF(
                            0f,
                            0f,
                            outputWidth.toFloat(),
                            outputHeight.toFloat()
                        )

                        canvas.drawBitmap(unityBitmap, null, unityDestRect, bitmapPaint)
                        canvas.drawBitmap(overlayBitmap, null, overlayDestRect, bitmapPaint)

                        val outputFile = saveBitmapToShareExport(outputBitmap)

                        if (!overlayBitmap.isRecycled) {
                            overlayBitmap.recycle()
                        }
                        if (!outputBitmap.isRecycled) {
                            outputBitmap.recycle()
                        }
                        if (!unityBitmap.isRecycled) {
                            unityBitmap.recycle()
                        }

                        val result = Arguments.createMap().apply {
                            putString("uri", Uri.fromFile(outputFile).toString())
                            putDouble("width", outputWidth.toDouble())
                            putDouble("height", outputHeight.toDouble())
                        }

                        promise.resolve(result)
                    } catch (e: Exception) {
                        if (!unityBitmap.isRecycled) {
                            unityBitmap.recycle()
                        }
                        Log.e(TAG, "composeShareExportFromUnityAndOverlay error: ${e.message}", e)
                        promise.reject(
                            "IMAGE_EXPORT_ERROR",
                            "Failed to compose Unity share export",
                            e
                        )
                    }
                }, mainHandler)
            } catch (e: Exception) {
                Log.e(TAG, "composeShareExportFromUnityAndOverlay setup error: ${e.message}", e)
                promise.reject("IMAGE_EXPORT_ERROR", "Failed to compose Unity share export", e)
            }
        }
    }

    @ReactMethod
    fun detectDiagnosticMarkers(
        sourceUri: String,
        markerColorHexes: ReadableArray,
        promise: Promise
    ) {
        try {
            val sourceBitmap = decodeBitmapFromUri(sourceUri)
            val pixels = IntArray(sourceBitmap.width * sourceBitmap.height)
            sourceBitmap.getPixels(
                pixels,
                0,
                sourceBitmap.width,
                0,
                0,
                sourceBitmap.width,
                sourceBitmap.height
            )

            val result = Arguments.createArray()
            for (index in 0 until markerColorHexes.size()) {
                val colorHex = markerColorHexes.getString(index)
                val detection = if (colorHex.isNullOrBlank()) {
                    null
                } else {
                    detectColorBounds(
                        pixels,
                        sourceBitmap.width,
                        sourceBitmap.height,
                        Color.parseColor(colorHex)
                    )
                }

                val markerMap = Arguments.createMap().apply {
                    putString("colorHex", colorHex)
                    putBoolean("detected", detection != null)

                    if (detection != null) {
                        putDouble("x", detection[0].toDouble())
                        putDouble("y", detection[1].toDouble())
                        putDouble("width", detection[2].toDouble())
                        putDouble("height", detection[3].toDouble())
                    }
                }
                result.pushMap(markerMap)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "detectDiagnosticMarkers error: ${e.message}", e)
            promise.reject("IMAGE_MARKER_DETECTION_ERROR", "Failed to detect diagnostic markers", e)
        }
    }

    private fun detectColorBounds(
        pixels: IntArray,
        bitmapWidth: Int,
        bitmapHeight: Int,
        targetColor: Int
    ): IntArray? {
        var minX = bitmapWidth
        var minY = bitmapHeight
        var maxX = -1
        var maxY = -1

        for (pixelIndex in pixels.indices) {
            val pixel = pixels[pixelIndex]
            if (!colorsMatch(pixel, targetColor)) {
                continue
            }

            val x = pixelIndex % bitmapWidth
            val y = pixelIndex / bitmapWidth
            if (x < minX) minX = x
            if (y < minY) minY = y
            if (x > maxX) maxX = x
            if (y > maxY) maxY = y
        }

        if (maxX < minX || maxY < minY) {
            return null
        }

        return intArrayOf(
            minX,
            minY,
            maxX - minX + 1,
            maxY - minY + 1
        )
    }

    private fun colorsMatch(pixelColor: Int, targetColor: Int): Boolean {
        if (Color.alpha(pixelColor) < 180) {
            return false
        }

        return abs(Color.red(pixelColor) - Color.red(targetColor)) <= 24 &&
            abs(Color.green(pixelColor) - Color.green(targetColor)) <= 24 &&
            abs(Color.blue(pixelColor) - Color.blue(targetColor)) <= 24
    }

    private fun findFirstSurfaceView(root: View): SurfaceView? {
        if (root is SurfaceView) {
            return root
        }

        if (root !is ViewGroup) {
            return null
        }

        for (childIndex in 0 until root.childCount) {
            val child = root.getChildAt(childIndex)
            val matchedSurfaceView = findFirstSurfaceView(child)
            if (matchedSurfaceView != null) {
                return matchedSurfaceView
            }
        }

        return null
    }

    private fun calculateDescendantBoundsRelativeToAncestor(
        descendant: View,
        ancestor: View
    ): RectF {
        var left = 0f
        var top = 0f
        var current: View? = descendant

        while (current != null && current !== ancestor) {
            val parentView = current.parent as? View
                ?: throw IllegalStateException("Ancestor is not in the descendant view hierarchy")

            left += current.left - parentView.scrollX
            top += current.top - parentView.scrollY
            current = parentView
        }

        if (current !== ancestor) {
            throw IllegalStateException("Ancestor is not in the descendant view hierarchy")
        }

        return RectF(
            left,
            top,
            left + descendant.width,
            top + descendant.height
        )
    }

    private fun decodeBitmapFromUri(sourceUri: String): Bitmap {
        val parsedUri = Uri.parse(sourceUri)
        val options = BitmapFactory.Options().apply {
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }

        val bitmap = if (parsedUri.scheme == "content") {
            reactApplicationContext.contentResolver.openInputStream(parsedUri)?.use { inputStream ->
                BitmapFactory.decodeStream(inputStream, null, options)
            }
        } else {
            BitmapFactory.decodeFile(parsedUri.path ?: sourceUri, options)
        }

        return bitmap ?: throw IllegalStateException("Failed to decode bitmap from $sourceUri")
    }

    private fun saveBitmapToShareExport(bitmap: Bitmap): File {
        val outputDir = File(reactApplicationContext.cacheDir, "ShareExport").apply {
            if (!exists()) {
                mkdirs()
            }
        }
        val outputFile = File(outputDir, "${UUID.randomUUID()}.png")

        FileOutputStream(outputFile).use { fileOut ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, fileOut)
        }

        return outputFile
    }

    // MARK: - Promise-based Avatar Change Method

    /**
     * 아바타 변경 후 완료를 기다리는 메서드
     * iOS의 changeAvatarAndWait와 동일한 기능
     *
     * @param objectName Unity GameObject 이름
     * @param methodName Unity에서 호출할 메서드 이름
     * @param data 전달할 데이터 (문자열)
     * @param promise React Native Promise (Boolean 반환 - true: 성공, false: 타임아웃)
     */
    @ReactMethod
    fun changeAvatarAndWait(
        objectName: String,
        methodName: String,
        data: String,
        promise: Promise
    ) {
        Log.d(TAG, "changeAvatarAndWait: $objectName.$methodName($data)")

        synchronized(avatarLock) {
            // 이전 pending promise 정리 (새 요청이 들어오면 이전 요청은 취소)
            pendingAvatarResolve?.reject("CANCELLED", "New avatar change request", null)
            avatarTimeoutHandler?.removeCallbacksAndMessages(null)

            // 새 promise 설정
            pendingAvatarResolve = promise

            // 타임아웃 설정
            avatarTimeoutHandler = Handler(Looper.getMainLooper())
            avatarTimeoutHandler?.postDelayed({
                synchronized(avatarLock) {
                    if (pendingAvatarResolve === promise) {
                        Log.w(TAG, "Avatar change timed out after ${AVATAR_TIMEOUT_MS}ms")
                        pendingAvatarResolve?.resolve(false)
                        pendingAvatarResolve = null
                        avatarTimeoutHandler = null
                    }
                }
            }, AVATAR_TIMEOUT_MS)
        }

        // Unity 메시지 전송
        try {
            UnityHolder.sendMessage(objectName, methodName, data)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send avatar change message: ${e.message}", e)
            synchronized(avatarLock) {
                avatarTimeoutHandler?.removeCallbacksAndMessages(null)
                avatarTimeoutHandler = null
                pendingAvatarResolve?.reject("UNITY_MESSAGE_ERROR", "Failed to send message: ${e.message}", e)
                pendingAvatarResolve = null
            }
        }
    }

    // MARK: - Promise-based Character Capture Method

    /**
     * Unity 캐릭터 캡처 메서드
     * iOS의 captureCharacter와 동일한 기능
     *
     * @param promise React Native Promise (String 반환 - Base64 이미지 또는 에러)
     */
    @ReactMethod
    fun captureCharacter(promise: Promise) {
        Log.d(TAG, "captureCharacter() called")

        val callbackId = UUID.randomUUID().toString()

        synchronized(captureLock) {
            pendingCaptureCallbacks[callbackId] = promise
        }

        // Unity에 캡처 요청 전송
        try {
            UnityHolder.sendMessage("Charactor", "CaptureCharacter", callbackId)

            // 타임아웃 설정
            mainHandler.postDelayed({
                synchronized(captureLock) {
                    val pendingPromise = pendingCaptureCallbacks.remove(callbackId)
                    if (pendingPromise != null) {
                        Log.w(TAG, "Character capture timed out for callbackId: $callbackId")
                        pendingPromise.reject("TIMEOUT", "Character capture timed out", null)
                    }
                }
            }, CAPTURE_TIMEOUT_MS)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send capture request: ${e.message}", e)
            synchronized(captureLock) {
                pendingCaptureCallbacks.remove(callbackId)
            }
            promise.reject("CAPTURE_ERROR", "Failed to request capture: ${e.message}", e)
        }
    }

    // MARK: - Unity Message Methods

    /**
     * Unity에 일반 메시지 전송 (순수 브리지)
     * iOS의 sendUnityMessage와 동일한 기능
     *
     * @param objectName Unity GameObject 이름
     * @param methodName Unity에서 호출할 메서드 이름
     * @param parameter 전달할 파라미터 (문자열)
     * @param promise React Native Promise
     */
    @ReactMethod
    fun sendUnityMessage(
        objectName: String,
        methodName: String,
        parameter: String,
        promise: Promise
    ) {
        Log.d(TAG, "sendUnityMessage: $objectName.$methodName($parameter)")

        try {
            UnityHolder.sendMessage(objectName, methodName, parameter)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send Unity message: ${e.message}", e)
            promise.reject("UNITY_MESSAGE_ERROR", "Failed to send Unity message: ${e.message}", e)

            // 에러 이벤트 전송
            sendErrorEvent("UNITY_MESSAGE_ERROR", "Failed to send Unity message", e.message ?: "Unknown error")
        }
    }

    /**
     * Unity에 JSON 데이터 전송 (배열/딕셔너리용)
     * iOS의 sendUnityJSON과 동일한 기능
     *
     * @param objectName Unity GameObject 이름
     * @param methodName Unity에서 호출할 메서드 이름
     * @param data 전달할 데이터 (ReadableArray)
     * @param promise React Native Promise
     */
    @ReactMethod
    fun sendUnityJSON(
        objectName: String,
        methodName: String,
        data: ReadableArray,
        promise: Promise
    ) {
        Log.d(TAG, "sendUnityJSON: $objectName.$methodName with ${data.size()} items")

        try {
            // ReadableArray를 JSON 문자열로 변환
            val jsonArray = convertReadableArrayToJsonArray(data)
            val jsonString = jsonArray.toString()

            Log.d(TAG, "JSON string: $jsonString")

            // Unity로 전송
            UnityHolder.sendMessage(objectName, methodName, jsonString)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send Unity JSON: ${e.message}", e)
            promise.reject("JSON_CONVERSION_ERROR", "Failed to convert data to JSON: ${e.message}", e)

            // 에러 이벤트 전송
            sendErrorEvent("JSON_CONVERSION_ERROR", "Failed to convert data to JSON", e.message ?: "Unknown error")
        }
    }

    // MARK: - Lifecycle Event Listener

    override fun onHostResume() {
        Log.d(TAG, "onHostResume()")
        UnityHolder.onResume()
    }

    override fun onHostPause() {
        Log.d(TAG, "onHostPause()")
        UnityHolder.onPause()
    }

    override fun onHostDestroy() {
        Log.d(TAG, "onHostDestroy()")

        // 리스너 정리
        UnityHolder.onCharactorReadyListener = null
        UnityHolder.onAvatarReadyListener = null

        // Promise 관련 리소스 정리
        synchronized(avatarLock) {
            avatarTimeoutHandler?.removeCallbacksAndMessages(null)
            avatarTimeoutHandler = null
            pendingAvatarResolve = null
        }

        synchronized(captureLock) {
            pendingCaptureCallbacks.clear()
        }

        // 싱글톤 인스턴스 정리
        instance = null
    }

    // MARK: - Shared Editor Methods (공유 에디터 메서드들)

    /**
     * Unity 캐릭터 표시/숨김 설정 (공유 에디터용)
     */
    @ReactMethod
    fun setCharacterVisible(visible: Boolean, promise: Promise) {
        Log.d(TAG, "setCharacterVisible: $visible")

        try {
            UnityHolder.sendMessage(
                "Charactor",
                "SetCharacterVisible",
                if (visible) "true" else "false"
            )
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setCharacterVisible error: ${e.message}", e)
            promise.reject("SET_CHARACTER_VISIBLE_ERROR", "Failed to set character visible", e)
        }
    }

    /**
     * 배경 설정 (배경 ID 기반)
     * iOS의 setBackground와 동일한 기능
     *
     * @param backgroundId 배경 ID
     * @param promise React Native Promise
     */
    @ReactMethod
    fun setBackground(backgroundId: String, promise: Promise) {
        Log.d(TAG, "setBackground: $backgroundId")

        try {
            UnityHolder.sendMessage("Background", "SetBackground", backgroundId)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setBackground error: ${e.message}", e)
            promise.reject("SET_BACKGROUND_ERROR", "Failed to set background", e)
        }
    }

    /**
     * 배경색 설정
     * iOS의 setBackgroundColor와 동일한 기능
     *
     * @param hexColor HEX 색상 코드 (예: "#FF0000")
     * @param promise React Native Promise
     */
    @ReactMethod
    fun setBackgroundColor(hexColor: String, promise: Promise) {
        Log.d(TAG, "setBackgroundColor: $hexColor")

        try {
            UnityHolder.sendMessage("Background", "SetBackgroundColor", hexColor)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setBackgroundColor error: ${e.message}", e)
            promise.reject("SET_BACKGROUND_COLOR_ERROR", "Failed to set background color", e)
        }
    }

    /**
     * 사진으로 배경 설정
     * iOS의 setBackgroundFromPhoto와 동일한 기능
     *
     * @param base64Image Base64 인코딩된 이미지 데이터
     * @param promise React Native Promise
     */
    @ReactMethod
    fun setBackgroundFromPhoto(base64Image: String, promise: Promise) {
        Log.d(TAG, "setBackgroundFromPhoto: (base64 image length: ${base64Image.length})")

        try {
            UnityHolder.sendMessage("Background", "SetBackgroundFromBase64", base64Image)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setBackgroundFromPhoto error: ${e.message}", e)
            promise.reject("SET_BACKGROUND_FROM_PHOTO_ERROR", "Failed to set background from photo", e)
        }
    }

    /**
     * 캐릭터 위치 설정
     * iOS의 setCharacterPosition과 동일한 기능
     *
     * @param x X 좌표
     * @param y Y 좌표
     * @param promise React Native Promise
     */
    @ReactMethod
    fun setCharacterPosition(x: Double, y: Double, promise: Promise) {
        Log.d(TAG, "setCharacterPosition: ($x, $y)")

        try {
            val json = """{"x":$x,"y":$y}"""
            UnityHolder.sendMessage("Charactor", "SetCharacterPosition", json)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setCharacterPosition error: ${e.message}", e)
            promise.reject("SET_CHARACTER_POSITION_ERROR", "Failed to set character position", e)
        }
    }

    /**
     * 캐릭터 스케일 설정
     * iOS의 setCharacterScale과 동일한 기능
     *
     * @param scale 스케일 값
     * @param promise React Native Promise
     */
    @ReactMethod
    fun setCharacterScale(scale: Double, promise: Promise) {
        Log.d(TAG, "setCharacterScale: $scale")

        try {
            UnityHolder.sendMessage("Charactor", "SetCharacterScale", scale.toString())
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "setCharacterScale error: ${e.message}", e)
            promise.reject("SET_CHARACTER_SCALE_ERROR", "Failed to set character scale", e)
        }
    }

    // MARK: - Unity Engine Methods (Unity 엔진 메서드들)

    /**
     * Unity 엔진 준비 상태 확인
     * iOS의 isEngineReady와 동일한 기능
     *
     * @param promise React Native Promise (Boolean 반환)
     */
    @ReactMethod
    fun isEngineReady(promise: Promise) {
        val isReady = UnityHolder.isUnityReady
        Log.d(TAG, "isEngineReady: $isReady")
        promise.resolve(isReady)
    }

    /**
     * Unity 엔진 초기화
     * iOS의 initializeUnityEngine과 동일한 기능
     *
     * @param promise React Native Promise
     */
    @ReactMethod
    fun initializeUnityEngine(promise: Promise) {
        Log.d(TAG, "initializeUnityEngine() called")

        try {
            UnityHolder.initialize()
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "initializeUnityEngine error: ${e.message}", e)
            promise.reject("INITIALIZE_UNITY_ERROR", "Failed to initialize Unity engine", e)
        }
    }

    // MARK: - Helper Methods

    /**
     * ReadableArray를 JSONArray로 변환
     */
    private fun convertReadableArrayToJsonArray(readableArray: ReadableArray): JSONArray {
        val jsonArray = JSONArray()

        for (i in 0 until readableArray.size()) {
            when (readableArray.getType(i)) {
                ReadableType.Null -> jsonArray.put(JSONObject.NULL)
                ReadableType.Boolean -> jsonArray.put(readableArray.getBoolean(i))
                ReadableType.Number -> jsonArray.put(readableArray.getDouble(i))
                ReadableType.String -> jsonArray.put(readableArray.getString(i))
                ReadableType.Map -> {
                    val map = readableArray.getMap(i)
                    if (map != null) {
                        jsonArray.put(convertReadableMapToJsonObject(map))
                    }
                }
                ReadableType.Array -> {
                    val array = readableArray.getArray(i)
                    if (array != null) {
                        jsonArray.put(convertReadableArrayToJsonArray(array))
                    }
                }
            }
        }

        return jsonArray
    }

    /**
     * ReadableMap을 org.json.JSONObject로 변환
     */
    private fun convertReadableMapToJsonObject(readableMap: ReadableMap): org.json.JSONObject {
        val jsonObject = org.json.JSONObject()
        val iterator = readableMap.keySetIterator()

        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (readableMap.getType(key)) {
                ReadableType.Null -> jsonObject.put(key, org.json.JSONObject.NULL)
                ReadableType.Boolean -> jsonObject.put(key, readableMap.getBoolean(key))
                ReadableType.Number -> jsonObject.put(key, readableMap.getDouble(key))
                ReadableType.String -> jsonObject.put(key, readableMap.getString(key))
                ReadableType.Map -> {
                    val map = readableMap.getMap(key)
                    if (map != null) {
                        jsonObject.put(key, convertReadableMapToJsonObject(map))
                    }
                }
                ReadableType.Array -> {
                    val array = readableMap.getArray(key)
                    if (array != null) {
                        jsonObject.put(key, convertReadableArrayToJsonArray(array))
                    }
                }
            }
        }

        return jsonObject
    }

    /**
     * React Native로 이벤트 전송
     */
    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * 에러 이벤트 전송
     */
    private fun sendErrorEvent(type: String, message: String, error: String) {
        val params = Arguments.createMap().apply {
            putString("type", type)
            putString("message", message)
            putString("error", error)
        }
        sendEvent(EVENT_ON_UNITY_ERROR, params)
    }

    /**
     * ISO 8601 형식의 현재 시간 문자열 반환
     */
    private fun getISO8601Timestamp(): String {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        dateFormat.timeZone = TimeZone.getTimeZone("UTC")
        return dateFormat.format(Date())
    }
}
