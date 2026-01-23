package com.hongtaeho.app.unity

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.unity3d.player.UnityPlayerForActivityOrService
import java.text.SimpleDateFormat
import java.util.*

/**
 * Unity View Container
 * React Native에서 사용할 수 있는 Native Unity View
 * iOS의 UnityView.swift와 동일한 역할
 *
 * Features:
 * - Aspect Fill 레이아웃 (iOS와 동일)
 * - 앱 생명주기 관리
 * - Unity View 재연결 (Reattach) 지원
 */
class UnityView(context: Context) : FrameLayout(context) {

    companion object {
        private const val TAG = "UnityView"

        // Unity 렌더링 기준 크기 (iOS와 동일)
        private const val UNITY_RENDER_WIDTH = 600f
        private const val UNITY_RENDER_HEIGHT = 600f
    }

    // MARK: - Properties

    private var unityPlayer: UnityPlayerForActivityOrService? = null
    private var isUnityLoaded = false
    private var pendingReattach = false

    private val mainHandler = Handler(Looper.getMainLooper())

    // MARK: - React Native Event Callbacks

    /** React Native View ID (이벤트 발송용) */
    private var viewId: Int = View.NO_ID

    /** React Context 참조 */
    private val reactContext: ReactContext?
        get() = context as? ReactContext

    // MARK: - Initialization

    init {
        Log.d(TAG, "UnityView init")

        // 배경색 설정
        setBackgroundColor(android.graphics.Color.BLACK)

        // Container 밖으로 나가는 부분 잘라내기 (Aspect Fill)
        clipChildren = true
        clipToPadding = true

        // Unity 초기화
        initializeUnity()
    }

    // MARK: - Unity Initialization

    private fun initializeUnity() {
        Log.d(TAG, "initializeUnity()")

        mainHandler.post {
            try {
                val activity = (context as? ReactContext)?.currentActivity
                if (activity == null) {
                    Log.e(TAG, "Activity is null, cannot initialize Unity")
                    sendErrorEvent("UNITY_INIT_ERROR", "Activity is null")
                    return@post
                }

                // 싱글톤 Unity Player 사용 (앱 전체에서 하나의 인스턴스만 유지)
                unityPlayer = try {
                    UnityHolder.getOrCreateUnityPlayer(activity)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to create UnityPlayer: ${e.message}", e)
                    sendErrorEvent("UNITY_INIT_ERROR", "Failed to create UnityPlayer: ${e.message}")
                    return@post
                }

                unityPlayer?.let { player ->
                    val unityView = player.view

                    // 기존 부모에서 제거
                    (unityView?.parent as? ViewGroup)?.removeView(unityView)

                    // 현재 View에 추가
                    unityView?.let {
                        addView(it, LayoutParams(
                            LayoutParams.MATCH_PARENT,
                            LayoutParams.MATCH_PARENT
                        ))
                    }

                    // Unity 시작 - lifecycle 메서드 순서대로 호출
                    player.onStart()   // Scene 실행 시작
                    player.onResume()  // 렌더링 재개
                    player.windowFocusChanged(true)  // Window Focus 부여 (렌더링 트리거)

                    isUnityLoaded = true
                    Log.d(TAG, "Unity initialized successfully - onStart(), onResume(), windowFocusChanged(true) called")

                    requestLayout()
                    ensureUnityViewLayout()

                    sendUnityReadyEvent("Unity loaded successfully")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize Unity: ${e.message}", e)
                sendErrorEvent("UNITY_INIT_ERROR", e.message ?: "Unknown error")
            }
        }
    }

    // MARK: - Measure (React Native 크기 수신)

    /**
     * React Native가 계산한 크기를 그대로 사용
     * FrameLayout 기본 구현은 자식 뷰 기반으로 크기를 결정하는데,
     * Unity 자식 뷰가 비동기로 추가되므로 크기가 0이 될 수 있음.
     * 이 오버라이드로 React Native의 Yoga 레이아웃 크기를 직접 사용.
     */
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        val height = MeasureSpec.getSize(heightMeasureSpec)

        setMeasuredDimension(width, height)

        Log.d(TAG, "onMeasure: width=$width, height=$height")
    }

    // MARK: - Layout (Aspect Fill)

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        val player = unityPlayer ?: return
        val unityView = player.view ?: return

        // 참고: 초기화 중에도 레이아웃은 적용되어야 함 (pause 체크 제거)
        // Unity가 화면에 렌더링되려면 레이아웃이 필요함

        // Container 크기
        val containerWidth = (right - left).toFloat()
        val containerHeight = (bottom - top).toFloat()

        if (containerWidth <= 0 || containerHeight <= 0) return

        // Aspect Fill 계산: 더 큰 scale을 사용하여 container를 채움
        val widthScale = containerWidth / UNITY_RENDER_WIDTH
        val heightScale = containerHeight / UNITY_RENDER_HEIGHT

        // Container의 긴 쪽 dimension 기준으로 scale 선택
        val fillScale = if (containerWidth >= containerHeight) {
            widthScale  // width가 더 길면 width 기준
        } else {
            heightScale  // height가 더 길면 height 기준
        }

        // Unity View 크기 (확대됨)
        val scaledWidth = (UNITY_RENDER_WIDTH * fillScale).toInt()
        val scaledHeight = (UNITY_RENDER_HEIGHT * fillScale).toInt()

        // 정렬: 좌우 중앙, 아래쪽에 붙임
        val x = ((containerWidth - scaledWidth) / 2).toInt()
        val y = (containerHeight - scaledHeight).toInt()

        // 자식 뷰 측정 후 배치
        val childWidthSpec = MeasureSpec.makeMeasureSpec(scaledWidth, MeasureSpec.EXACTLY)
        val childHeightSpec = MeasureSpec.makeMeasureSpec(scaledHeight, MeasureSpec.EXACTLY)
        unityView.measure(childWidthSpec, childHeightSpec)
        unityView.layout(x, y, x + scaledWidth, y + scaledHeight)

        Log.d(TAG, "onLayout: container=${containerWidth}x${containerHeight}, " +
                "unity=${scaledWidth}x${scaledHeight}, pos=($x,$y), scale=$fillScale")
    }

    // MARK: - Unity View Layout Helpers

    /**
     * Unity view에 명시적으로 레이아웃 적용
     * onLayout이 early return된 경우를 보완
     */
    private fun applyUnityViewLayout() {
        val w = width
        val h = height
        if (w <= 0 || h <= 0) {
            Log.d(TAG, "applyUnityViewLayout: size not ready ($w x $h)")
            return
        }

        val uView = unityPlayer?.view ?: return

        val widthScale = w.toFloat() / UNITY_RENDER_WIDTH
        val heightScale = h.toFloat() / UNITY_RENDER_HEIGHT
        val fillScale = if (w >= h) widthScale else heightScale

        val scaledWidth = (UNITY_RENDER_WIDTH * fillScale).toInt()
        val scaledHeight = (UNITY_RENDER_HEIGHT * fillScale).toInt()
        val x = (w - scaledWidth) / 2
        val y = h - scaledHeight

        val childWidthSpec = MeasureSpec.makeMeasureSpec(scaledWidth, MeasureSpec.EXACTLY)
        val childHeightSpec = MeasureSpec.makeMeasureSpec(scaledHeight, MeasureSpec.EXACTLY)
        uView.measure(childWidthSpec, childHeightSpec)
        uView.layout(x, y, x + scaledWidth, y + scaledHeight)

        Log.d(TAG, "applyUnityViewLayout: ${scaledWidth}x${scaledHeight} at ($x,$y)")
    }

    /**
     * 레이아웃 완료 후 Unity view 레이아웃 적용을 보장
     * post를 사용하여 다음 프레임에서 실행
     */
    private fun ensureUnityViewLayout() {
        post {
            if (width > 0 && height > 0 && unityPlayer?.view != null) {
                applyUnityViewLayout()
                Log.d(TAG, "ensureUnityViewLayout: applied via post")
            } else {
                // 아직 준비되지 않았으면 다시 시도
                postDelayed({
                    if (width > 0 && height > 0 && unityPlayer?.view != null) {
                        applyUnityViewLayout()
                        Log.d(TAG, "ensureUnityViewLayout: applied via postDelayed")
                    }
                }, 100)
            }
        }
    }

    // MARK: - View Lifecycle

    override fun setId(id: Int) {
        super.setId(id)
        viewId = id
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        Log.d(TAG, "onAttachedToWindow")

        // Unity가 로드되었으면 항상 재연결 시도
        // 화면 전환 후 복귀 시 Unity view가 다른 컨테이너에 있을 수 있음
        if (isUnityLoaded) {
            safeReattachUnityView()
        }
        pendingReattach = false
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        Log.d(TAG, "onDetachedFromWindow")
    }

    // MARK: - Unity Control Methods

    /**
     * Unity View 재연결 (다른 화면에서 사용 후 돌아올 때)
     */
    fun reattachUnityView() {
        safeReattachUnityView()
    }

    /**
     * Unity View 안전한 재연결
     */
    private fun safeReattachUnityView() {
        if (!isUnityLoaded) {
            Log.d(TAG, "Unity not loaded, cannot reattach")
            return
        }

        // 앱이 활성 상태가 아니면 reattach 대기
        if (!UnityHolder.isAppActive) {
            Log.d(TAG, "Not safe to reattach, queueing for later")
            pendingReattach = true
            return
        }

        mainHandler.post {
            val player = unityPlayer ?: return@post
            val unityView = player.view ?: return@post

            // 이미 현재 view에 붙어있으면 스킵
            if (unityView.parent == this) {
                Log.d(TAG, "Unity view already attached to this view, skipping reattach")
                return@post
            }

            val wasAttachedElsewhere = unityView.parent != null

            // 다른 superview에서 제거
            (unityView.parent as? ViewGroup)?.removeView(unityView)

            // 현재 view에 추가
            addView(unityView, LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            ))

            // 레이아웃 업데이트
            requestLayout()
            ensureUnityViewLayout()

            Log.d(TAG, "Unity view reattached safely (wasAttachedElsewhere: $wasAttachedElsewhere)")

            // 실제로 다른 곳에서 옮겨온 경우에만 React Native에 알림
            if (wasAttachedElsewhere) {
                sendUnityReadyEvent("Unity reattached successfully", "reattach")
            }
        }
    }

    /**
     * Unity 일시정지
     */
    fun pauseUnity() {
        Log.d(TAG, "Pausing Unity")
        unityPlayer?.pause()
    }

    /**
     * Unity 재개
     */
    fun resumeUnity() {
        Log.d(TAG, "Resuming Unity")
        unityPlayer?.resume()
    }

    /**
     * Unity에 메시지 전송
     */
    fun sendMessageToUnity(objectName: String, methodName: String, parameter: String) {
        if (!isUnityLoaded) {
            Log.w(TAG, "Unity not loaded yet")
            return
        }

        UnityHolder.sendMessage(objectName, methodName, parameter)
    }

    // MARK: - Cleanup

    /**
     * View 정리
     */
    fun cleanup() {
        Log.d(TAG, "Cleaning up Unity view")

        // Unity View는 제거하지 않음 - 다른 화면에서 사용할 수 있음
        // unityPlayer?.let { player ->
        //     removeView(player)
        //     player.destroy()
        // }
    }

    // MARK: - React Native Events

    /**
     * Unity Ready 이벤트 발송
     */
    private fun sendUnityReadyEvent(message: String, type: String = "load") {
        val event = Arguments.createMap().apply {
            putString("message", message)
            putString("type", type)
            putString("timestamp", getISO8601Timestamp())
        }
        sendEvent("onUnityReady", event)
    }

    /**
     * 에러 이벤트 발송
     */
    private fun sendErrorEvent(errorType: String, errorMessage: String) {
        val event = Arguments.createMap().apply {
            putString("error", errorMessage)
            putString("type", errorType)
            putString("timestamp", getISO8601Timestamp())
        }
        sendEvent("onUnityError", event)
    }

    /**
     * React Native로 이벤트 전송
     */
    private fun sendEvent(eventName: String, params: WritableMap) {
        val ctx = reactContext ?: return

        if (viewId == View.NO_ID) {
            Log.w(TAG, "View ID not set, cannot send event: $eventName")
            return
        }

        ctx.getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(viewId, eventName, params)
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
