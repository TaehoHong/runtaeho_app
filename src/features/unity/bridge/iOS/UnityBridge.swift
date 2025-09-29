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
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            do {
                try self.unityManager?.initializeUnity()
                resolve(["success": true])
            } catch {
                reject("UNITY_INIT_ERROR", "Failed to initialize Unity", error)
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
        if hasListeners {
            sendEvent(withName: "UnityReady", body: ["ready": true])
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
