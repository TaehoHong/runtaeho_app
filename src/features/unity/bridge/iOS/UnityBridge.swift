import Foundation
import React

@objc(UnityBridge)
class UnityBridge: RCTEventEmitter {
    
    private var hasListeners = false
    private var unityManager: UnityManager?
    
    
    override init() {
        super.init()
        NSLog("🔥 [SWIFT] UnityBridge Swift module initialized")
        print("🔥 [SWIFT PRINT] UnityBridge initialized")
        unityManager = UnityManager.shared

        // UnityManager에 자신을 등록
        UnityManager.shared.unityBridge = self
        NSLog("🔥 [SWIFT] UnityBridge registered to UnityManager")
    }
    
    // MARK: - RCTEventEmitter
    
    override static func requiresMainQueueSetup() -> Bool {
        NSLog("🔥 [SWIFT] requiresMainQueueSetup called")
        print("🔥 [SWIFT PRINT] requiresMainQueueSetup called")
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return [
            "UnityReady",
            "UnityMessage",
            "UnityError"
        ]
    }
    
    override func startObserving() {
        hasListeners = true
    }
    
    override func stopObserving() {
        hasListeners = false
    }
    
    // MARK: - Bridge Methods
    
    @objc
    func initialize(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("🚀 [UnityBridge] initialize() method called from RN")
        print("🚀 [SWIFT PRINT] initialize() method called")
        
        DispatchQueue.main.async { [weak self] in
            NSLog("🚀 [UnityBridge] initialize() executing on main queue")
            
            guard let self = self else {
                NSLog("❌ [UnityBridge] Self is nil in initialize()")
                reject("UNITY_INIT_ERROR", "Self is nil", nil)
                return
            }
            
            guard let unityManager = self.unityManager else {
                NSLog("❌ [UnityBridge] UnityManager is nil")
                reject("UNITY_INIT_ERROR", "Unity manager not available", nil)
                return
            }
            
            NSLog("🔧 [UnityBridge] Calling unityManager.initializeUnity()...")
            do {
                try unityManager.initializeUnity()
                NSLog("✅ [UnityBridge] Unity initialization successful")
                resolve(["success": true])
            } catch {
                NSLog("❌ [UnityBridge] Unity initialization failed: \(error.localizedDescription)")
                reject("UNITY_INIT_ERROR", "Failed to initialize Unity: \(error.localizedDescription)", error)
            }
        }
    }
    
    @objc
    func showUnity(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("🚀 [SWIFT] showUnity() method called")
        print("🚀 [SWIFT PRINT] showUnity() method called")
        DispatchQueue.main.async { [weak self] in
            NSLog("🚀 [SWIFT] showUnity() executing on main queue")
            print("🚀 [SWIFT PRINT] showUnity() executing on main queue")
            guard let self = self else {
              NSLog("[swift - UnityBridge] Self is nil")
                reject("UNITY_ERROR", "Self is nil", nil)
                return
            }

            guard let unityManager = self.unityManager else {
              NSLog("[swift - UnityBridge] Unity manager not available")
                reject("UNITY_ERROR", "Unity manager not available", nil)
                return
            }

            NSLog("[swift - UnityBridge] Calling unityManager.showUnity()")
            unityManager.showUnity()
            NSLog("[swift - UnityBridge] unityManager.showUnity() completed")
            resolve(["success": true])
        }
    }
    
    @objc
    func hideUnity(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self,
                  let unityManager = self.unityManager else {
                reject("UNITY_ERROR", "Unity manager not available", nil)
                return
            }
            
            unityManager.hideUnity()
            resolve(["success": true])
        }
    }
    
    @objc
    func sendMessage(_ gameObject: String,
                    methodName: String,
                    message: String,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self,
                  let unityManager = self.unityManager else {
                reject("UNITY_ERROR", "Unity manager not available", nil)
                return
            }
            
            unityManager.sendMessage(gameObject: gameObject,
                                    methodName: methodName,
                                    message: message)
            resolve(["success": true])
        }
    }
    
    // MARK: - Unity to RN Communication
    
    func notifyUnityReady() {
        NSLog("🔔 [UnityBridge] notifyUnityReady() called")
        NSLog("👂 [UnityBridge] hasListeners: \(hasListeners)")
        
        if hasListeners {
            NSLog("📤 [UnityBridge] Sending UnityReady event to React Native")
            sendEvent(withName: "UnityReady", body: ["ready": true])
            NSLog("✅ [UnityBridge] UnityReady event sent")
        } else {
            NSLog("⚠️ [UnityBridge] No listeners, UnityReady event not sent")
        }
    }
    
    func notifyUnityMessage(_ message: [String: Any]) {
        if hasListeners {
            sendEvent(withName: "UnityMessage", body: message)
        }
    }
    
    func notifyUnityError(_ error: String) {
        if hasListeners {
            sendEvent(withName: "UnityError", body: ["error": error])
        }
    }
}
