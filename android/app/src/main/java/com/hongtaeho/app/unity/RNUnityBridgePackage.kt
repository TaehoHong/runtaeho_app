package com.hongtaeho.app.unity

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * React Native Unity Bridge Package
 * RNUnityBridgeModule과 UnityViewManager를 React Native에 등록하는 패키지
 */
class RNUnityBridgePackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(RNUnityBridgeModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(UnityViewManager(reactContext))
    }
}
