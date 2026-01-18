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
import com.unity3d.player.UnityPlayer
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

    private var unityPlayer: UnityPlayer? = null
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
                // UnityPlayer 인스턴스 가져오기
                val activity = (context as? ReactContext)?.currentActivity
                if (activity == null) {
                    Log.e(TAG, "Activity is null, cannot initialize Unity")
                    sendErrorEvent("UNITY_INIT_ERROR", "Activity is null")
                    return@post
                }

                // Unity Player 생성 또는 기존 인스턴스 사용
                unityPlayer = try {
                    UnityPlayer(activity)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to create UnityPlayer: ${e.message}", e)
                    sendErrorEvent("UNITY_INIT_ERROR", "Failed to create UnityPlayer: ${e.message}")
                    return@post
                }

                unityPlayer?.let { player ->
                    // 기존 부모에서 제거
                    (player.parent as? ViewGroup)?.removeView(player)

                    // 현재 View에 추가
                    addView(player, LayoutParams(
                        LayoutParams.MATCH_PARENT,
                        LayoutParams.MATCH_PARENT
                    ))

                    // Unity 시작
                    player.resume()

                    isUnityLoaded = true

                    Log.d(TAG, "Unity initialized successfully")

                    // 레이아웃 업데이트 요청
                    requestLayout()

                    // React Native에 로드 완료 알림
                    sendUnityReadyEvent("Unity loaded successfully")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize Unity: ${e.message}", e)
                sendErrorEvent("UNITY_INIT_ERROR", e.message ?: "Unknown error")
            }
        }
    }

    // MARK: - Layout (Aspect Fill)

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)

        val player = unityPlayer ?: return

        // 앱이 활성 상태가 아니면 레이아웃 업데이트 스킵
        if (!UnityHolder.isAppActive) {
            Log.d(TAG, "App not active, skipping layout")
            return
        }

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

        // Frame 설정 (clipChildren으로 넘치는 부분 자름)
        player.layout(x, y, x + scaledWidth, y + scaledHeight)

        Log.d(TAG, "Aspect Fill: container=${containerWidth}x${containerHeight}, " +
                "unity=${scaledWidth}x${scaledHeight}, scale=$fillScale")
    }

    // MARK: - View Lifecycle

    override fun setId(id: Int) {
        super.setId(id)
        viewId = id
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        Log.d(TAG, "onAttachedToWindow")

        if (isUnityLoaded && pendingReattach) {
            pendingReattach = false
            safeReattachUnityView()
        }
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

            // 이미 현재 view에 붙어있으면 스킵
            if (player.parent == this) {
                Log.d(TAG, "Unity view already attached to this view, skipping reattach")
                return@post
            }

            val wasAttachedElsewhere = player.parent != null

            // 다른 superview에서 제거
            (player.parent as? ViewGroup)?.removeView(player)

            // 현재 view에 추가
            addView(player, LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            ))

            // 레이아웃 업데이트
            requestLayout()

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
