package com.hongtaeho.app.unity

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

/**
 * Unity View Manager
 * React Native에서 UnityView를 사용할 수 있게 해주는 ViewManager
 * iOS의 UnityViewManager.swift와 동일한 역할
 */
class UnityViewManager(
    private val reactContext: ReactApplicationContext
) : SimpleViewManager<UnityView>() {

    companion object {
        private const val TAG = "UnityViewManager"
        const val VIEW_NAME = "UnityView"

        // Commands
        private const val COMMAND_SEND_MESSAGE = 1
        private const val COMMAND_PAUSE = 2
        private const val COMMAND_RESUME = 3
        private const val COMMAND_REATTACH = 4
    }

    override fun getName(): String = VIEW_NAME

    // MARK: - View Creation

    override fun createViewInstance(reactContext: ThemedReactContext): UnityView {
        Log.d(TAG, "createViewInstance")
        return UnityView(reactContext)
    }

    override fun onDropViewInstance(view: UnityView) {
        Log.d(TAG, "onDropViewInstance")
        view.cleanup()
        super.onDropViewInstance(view)
    }

    // MARK: - Props

    // Props는 필요에 따라 추가 가능
    // @ReactProp(name = "someProp")
    // fun setSomeProp(view: UnityView, value: String?) {
    //     // handle prop
    // }

    // MARK: - Events

    /**
     * 내보낼 이벤트 목록
     * iOS의 RCT_EXPORT_VIEW_PROPERTY와 동일
     */
    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.builder<String, Any>()
            .put("onUnityReady", MapBuilder.of("registrationName", "onUnityReady"))
            .put("onUnityError", MapBuilder.of("registrationName", "onUnityError"))
            .put("onCharacterStateChanged", MapBuilder.of("registrationName", "onCharacterStateChanged"))
            .build()
    }

    // MARK: - Commands

    /**
     * React Native에서 호출할 수 있는 명령어 목록
     */
    override fun getCommandsMap(): Map<String, Int>? {
        return MapBuilder.builder<String, Int>()
            .put("sendMessageToUnity", COMMAND_SEND_MESSAGE)
            .put("pauseUnity", COMMAND_PAUSE)
            .put("resumeUnity", COMMAND_RESUME)
            .put("reattachUnityView", COMMAND_REATTACH)
            .build()
    }

    /**
     * 명령어 실행
     */
    override fun receiveCommand(view: UnityView, commandId: String?, args: ReadableArray?) {
        Log.d(TAG, "receiveCommand: $commandId, args: $args")

        when (commandId) {
            "sendMessageToUnity" -> {
                val objectName = args?.getString(0) ?: return
                val methodName = args.getString(1) ?: return
                val parameter = args.getString(2) ?: ""
                sendMessageToUnity(view, objectName, methodName, parameter)
            }
            "pauseUnity" -> pauseUnity(view)
            "resumeUnity" -> resumeUnity(view)
            "reattachUnityView" -> reattachUnityView(view)
        }
    }

    /**
     * Legacy command support (for older RN versions)
     */
    @Deprecated("Deprecated in Java")
    override fun receiveCommand(view: UnityView, commandId: Int, args: ReadableArray?) {
        when (commandId) {
            COMMAND_SEND_MESSAGE -> {
                val objectName = args?.getString(0) ?: return
                val methodName = args.getString(1) ?: return
                val parameter = args.getString(2) ?: ""
                sendMessageToUnity(view, objectName, methodName, parameter)
            }
            COMMAND_PAUSE -> pauseUnity(view)
            COMMAND_RESUME -> resumeUnity(view)
            COMMAND_REATTACH -> reattachUnityView(view)
        }
    }

    // MARK: - Command Implementations

    /**
     * Unity에 메시지 전송
     */
    private fun sendMessageToUnity(view: UnityView, objectName: String, methodName: String, parameter: String) {
        Log.d(TAG, "sendMessageToUnity: $objectName.$methodName($parameter)")
        view.sendMessageToUnity(objectName, methodName, parameter)
    }

    /**
     * Unity 일시정지
     */
    private fun pauseUnity(view: UnityView) {
        Log.d(TAG, "pauseUnity")
        view.pauseUnity()
    }

    /**
     * Unity 재개
     */
    private fun resumeUnity(view: UnityView) {
        Log.d(TAG, "resumeUnity")
        view.resumeUnity()
    }

    /**
     * Unity View 재연결
     */
    private fun reattachUnityView(view: UnityView) {
        Log.d(TAG, "reattachUnityView")
        view.reattachUnityView()
    }
}
