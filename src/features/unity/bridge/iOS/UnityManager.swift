import Foundation
import UIKit
import UnityFramework

class UnityManager: NSObject {
    
    static let shared = UnityManager()
    
    private let frameworkPath: String = "/Frameworks/UnityFramework.framework"
    private var unityFramework: UnityFramework?
    private var unityViewController: UIViewController?
    private var isUnityInitialized = false
    private weak var currentPresentingViewController: UIViewController?
    
    private override init() {
        super.init()
    }
    
    // MARK: - Unity Lifecycle
    
    func initializeUnity() throws {
        guard !isUnityInitialized else { return }
      
        
        // Unity Framework 로드 및 초기화
        if unityFramework == nil {
          
              // Load framework and get the singleton instance
              let bundlePath = Bundle.main.bundlePath + self.frameworkPath
              let bundle = Bundle(path: bundlePath)
              
              if bundle?.isLoaded == false {
                  bundle?.load()
              }
              
            unityFramework = bundle?.principalClass?.getInstance()! as! UnityFramework
            
            // Unity 초기화
            unityFramework?.setExecuteHeader(#dsohandle.assumingMemoryBound(to: MachHeader.self))
            unityFramework?.setDataBundleId("com.unity3d.framework")
            unityFramework?.register(self)
            unityFramework?.runEmbedded(
                withArgc: CommandLine.argc,
                argv: CommandLine.unsafeArgv,
                appLaunchOpts: nil
            )

            unityFramework?.appController()?.window.isHidden = true
        }
        
        // Unity View Controller 생성
        unityViewController = UnityViewController(unityFramework: unityFramework)
        
        isUnityInitialized = true
    }
    
    func showUnity() {
        guard isUnityInitialized else {
            print("[UnityManager] Unity not initialized")
            return
        }

        // Unity Window 표시 (iOS 메인 프로젝트 방식과 동일)
        unityFramework?.appController()?.window.isHidden = false
        unityFramework?.pause(false)

        print("[UnityManager] Unity window shown")
    }
    
    func hideUnity() {
        guard isUnityInitialized else {
            print("[UnityManager] Unity not initialized")
            return
        }

        // Unity 일시정지
        unityFramework?.pause(true)

        // Unity Window 숨김 (iOS 메인 프로젝트 방식과 동일)
        unityFramework?.appController()?.window.isHidden = true

        print("[UnityManager] Unity window hidden")
    }
    
    // MARK: - Unity Communication
    
    func sendMessage(gameObject: String, methodName: String, message: String) {
        // Unity SendMessage 호출
        guard let gameObjectCStr = gameObject.cString(using: .utf8),
              let methodNameCStr = methodName.cString(using: .utf8),
              let messageCStr = message.cString(using: .utf8) else {
            print("[UnityManager] Failed to convert strings to C strings")
            return
        }
        
        self.unityFramework?.sendMessageToGO(withName: gameObject, functionName: methodName, message: message)
        print("[UnityManager] SendMessage to \(gameObject).\(methodName): \(message)")
    }
    
    // MARK: - Unity Callbacks
    
    @objc func onUnityMessage(_ message: String) {
        // Unity에서 Native로 메시지를 보낼 때 호출되는 콜백
        if let bridge = getBridge() {
            let messageData: [String: Any] = [
                "message": message,
                "timestamp": Date().timeIntervalSince1970
            ]
            bridge.notifyUnityMessage(messageData)
        }
    }
    
    @objc func onUnityReady() {
        // Unity가 준비되었을 때 호출되는 콜백
        if let bridge = getBridge() {
            bridge.notifyUnityReady()
        }
    }
    
    @objc func onUnityError(_ error: String) {
        // Unity에서 에러가 발생했을 때 호출되는 콜백
        if let bridge = getBridge() {
            bridge.notifyUnityError(error)
        }
    }
    
    // MARK: - Helper
    
    private func getBridge() -> UnityBridge? {
        // React Native 브릿지 인스턴스를 찾아 반환
        // RCTBridge를 통해 모듈을 찾는 방식
        guard let bridge = UIApplication.shared.delegate?.window??.rootViewController as? UIViewController,
              let reactBridge = bridge.value(forKey: "bridge") as? NSObject else {
            return nil
        }
        
        // 실제 구현에서는 RCTBridge를 통해 모듈 인스턴스를 가져옵니다
        // 임시로 nil 반환
        return nil
    }
}

// MARK: - UnityFrameworkListener

extension UnityManager: UnityFrameworkListener {
    
    func unityDidUnload(_ notification: Notification) {
        print("[UnityManager] Unity did unload")
        unityFramework = nil
        unityViewController = nil
        isUnityInitialized = false
    }
    
    func unityDidQuit(_ notification: Notification) {
        print("[UnityManager] Unity did quit")
        unityFramework = nil
        unityViewController = nil
        isUnityInitialized = false
    }
}
