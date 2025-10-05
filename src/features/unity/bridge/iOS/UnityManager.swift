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

    // UnityBridge 인스턴스 저장
    weak var unityBridge: UnityBridge?

    private override init() {
        super.init()
    }
    
    // MARK: - Unity Lifecycle
    
    func initializeUnity() throws {
        NSLog("🚀 [UnityManager] initializeUnity() called")
        guard !isUnityInitialized else {
            NSLog("⚠️ [UnityManager] Unity already initialized")
            return
        }
      
        
        // Unity Framework 로드 및 초기화
        if unityFramework == nil {
            NSLog("📦 [UnityManager] Loading Unity Framework...")
            
            // Load framework and get the singleton instance
            let bundlePath = Bundle.main.bundlePath + self.frameworkPath
            NSLog("📂 [UnityManager] Bundle path: \(bundlePath)")
            
            let bundle = Bundle(path: bundlePath)
            
            if bundle == nil {
                NSLog("❌ [UnityManager] Unity Framework bundle not found!")
                throw NSError(domain: "UnityManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unity Framework bundle not found"])
            }
            
            NSLog("✅ [UnityManager] Unity Framework bundle found")
            
            if bundle?.isLoaded == false {
                NSLog("📤 [UnityManager] Loading Unity Framework bundle...")
                bundle?.load()
            }
            
            guard let principalClass = bundle?.principalClass else {
                NSLog("❌ [UnityManager] Principal class not found!")
                throw NSError(domain: "UnityManager", code: -2, userInfo: [NSLocalizedDescriptionKey: "Unity Framework principal class not found"])
            }
            
            NSLog("✅ [UnityManager] Getting Unity Framework instance...")
            unityFramework = principalClass.getInstance()! as! UnityFramework
            NSLog("✅ [UnityManager] Unity Framework instance obtained")
            
            // Unity 초기화
            NSLog("⚙️ [UnityManager] Initializing Unity Framework...")
            unityFramework?.setExecuteHeader(#dsohandle.assumingMemoryBound(to: MachHeader.self))
            unityFramework?.setDataBundleId("com.unity3d.framework")
            unityFramework?.register(self)
            
            NSLog("🎮 [UnityManager] Running Unity embedded...")
            unityFramework?.runEmbedded(
                withArgc: CommandLine.argc,
                argv: CommandLine.unsafeArgv,
                appLaunchOpts: nil
            )
            NSLog("✅ [UnityManager] Unity runEmbedded completed")

            unityFramework?.appController()?.window.isHidden = true
            NSLog("🙈 [UnityManager] Unity window hidden")
        }
        
        // Unity View Controller 생성
        NSLog("🎬 [UnityManager] Creating Unity ViewController...")
        unityViewController = UnityViewController(unityFramework: unityFramework)
        NSLog("✅ [UnityManager] Unity ViewController created")

        isUnityInitialized = true
        NSLog("✅ [UnityManager] Unity initialization completed successfully")

        // Unity Ready 이벤트 전송
        NSLog("⏰ [UnityManager] Scheduling onUnityReady callback in 0.5 seconds...")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            NSLog("🔔 [UnityManager] Calling onUnityReady now")
            self?.onUnityReady()
        }
    }
    
    func getUnityView() -> UIView? {
        NSLog("🔍 [UnityManager] getUnityView() called")
        
        guard isUnityInitialized else {
            NSLog("❌ [UnityManager] Unity not initialized, returning nil")
            return nil
        }
        NSLog("✅ [UnityManager] Unity is initialized")

        guard let unityView = unityFramework?.appController()?.rootView else {
            NSLog("❌ [UnityManager] Unity rootView not available")
            return nil
        }
        NSLog("✅ [UnityManager] Unity rootView obtained")

        // Unity 활성화
        unityFramework?.pause(false)
        NSLog("▶️ [UnityManager] Unity resumed (pause = false)")

        NSLog("✅ [UnityManager] Returning Unity view (frame: \(unityView.frame))")
        return unityView
    }

    func showUnity() {
        guard isUnityInitialized else {
            print("[UnityManager] Unity not initialized")
            return
        }

        // Unity 활성화만 수행 (UnityView 컴포넌트가 표시 담당)
        unityFramework?.pause(false)

        print("[UnityManager] Unity activated (embedded mode)")
    }
    
    func hideUnity() {
        guard isUnityInitialized else {
            print("[UnityManager] Unity not initialized")
            return
        }

        // Unity 일시정지만 수행 (UnityView 컴포넌트가 표시/숨김 담당)
        unityFramework?.pause(true)

        print("[UnityManager] Unity paused (embedded mode)")
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
        NSLog("[UnityManager] onUnityMessage: \(message)")
        if let bridge = unityBridge {
            let messageData: [String: Any] = [
                "message": message,
                "timestamp": Date().timeIntervalSince1970
            ]
            bridge.notifyUnityMessage(messageData)
        } else {
            NSLog("[UnityManager] UnityBridge not set, cannot notify message")
        }
    }

    @objc func onUnityReady() {
        // Unity가 준비되었을 때 호출되는 콜백
        NSLog("[UnityManager] onUnityReady called")
        if let bridge = unityBridge {
            bridge.notifyUnityReady()
            NSLog("[UnityManager] Unity ready event sent to bridge")
        } else {
            NSLog("[UnityManager] UnityBridge not set, cannot notify ready")
        }
    }

    @objc func onUnityError(_ error: String) {
        // Unity에서 에러가 발생했을 때 호출되는 콜백
        NSLog("[UnityManager] onUnityError: \(error)")
        if let bridge = unityBridge {
            bridge.notifyUnityError(error)
        } else {
            NSLog("[UnityManager] UnityBridge not set, cannot notify error")
        }
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
