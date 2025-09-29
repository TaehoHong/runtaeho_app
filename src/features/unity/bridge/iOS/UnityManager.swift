import Foundation
import UIKit

class UnityManager: NSObject {
    
    static let shared = UnityManager()
    
    private var unityViewController: UnityViewController?
    private var isUnityInitialized = false
    private weak var currentPresentingViewController: UIViewController?
    
    private override init() {
        super.init()
    }
    
    // MARK: - Unity Lifecycle
    
    func initializeUnity() throws {
        guard !isUnityInitialized else { return }
        
        // Unity 초기화 로직
        // UnityFramework를 로드하고 초기화하는 코드가 여기에 들어갑니다
        // 현재는 브릿지 구조만 제공합니다
        
        unityViewController = UnityViewController()
        isUnityInitialized = true
    }
    
    func showUnity() {
        guard isUnityInitialized,
              let rootViewController = UIApplication.shared.keyWindow?.rootViewController else {
            return
        }
        
        if unityViewController == nil {
            unityViewController = UnityViewController()
        }
        
        guard let unityVC = unityViewController else { return }
        
        // 이미 표시 중인 경우 무시
        if unityVC.presentingViewController != nil {
            return
        }
        
        currentPresentingViewController = rootViewController
        rootViewController.present(unityVC, animated: true, completion: nil)
    }
    
    func hideUnity() {
        guard let unityVC = unityViewController,
              unityVC.presentingViewController != nil else {
            return
        }
        
        unityVC.dismiss(animated: true, completion: nil)
    }
    
    // MARK: - Unity Communication
    
    func sendMessage(gameObject: String, methodName: String, message: String) {
        // Unity SendMessage 구현
        // UnitySendMessage(gameObject, methodName, message)
        // 실제 Unity 통합 시 위 함수를 호출합니다
        
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
        // 실제 구현 시 RCTBridge를 통해 모듈을 찾습니다
        return nil
    }
}
