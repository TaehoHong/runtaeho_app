//
//  UnityViewManager.swift
//  app
//
//  Created by Hong Taeho on 9/23/25.
//  React Native Unity View Manager
//

import React
import UIKit

@objc(UnityView)
class UnityViewManager: RCTViewManager {

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override var methodQueue: DispatchQueue? {
        return DispatchQueue.main
    }

    override func view() -> UIView {
        let unityView = UnityView()
        return unityView
    }

    // MARK: - React Native Props
    // 이벤트들은 .m 파일에서 RCT_EXPORT_VIEW_PROPERTY로 등록됩니다.

    // MARK: - React Native Commands

    // Unity에 메시지 전송
    @objc func sendMessageToUnity(_ node: NSNumber, objectName: NSString, methodName: NSString, parameter: NSString) {
        DispatchQueue.main.async {
            guard let unityView = self.bridge.uiManager.view(forReactTag: node) as? UnityView else {
                print("[UnityViewManager] Could not find UnityView for tag: \(node)")
                return
            }

            unityView.sendMessageToUnity(objectName as String, methodName: methodName as String, parameter: parameter as String)
        }
    }

    // Unity 일시정지
    @objc func pauseUnity(_ node: NSNumber) {
        DispatchQueue.main.async {
            guard let unityView = self.bridge.uiManager.view(forReactTag: node) as? UnityView else {
                return
            }

            unityView.pauseUnity()
        }
    }

    // Unity 재개
    @objc func resumeUnity(_ node: NSNumber) {
        DispatchQueue.main.async {
            guard let unityView = self.bridge.uiManager.view(forReactTag: node) as? UnityView else {
                return
            }

            unityView.resumeUnity()
        }
    }

    // Unity View 재연결
    @objc func reattachUnityView(_ node: NSNumber) {
        DispatchQueue.main.async {
            guard let unityView = self.bridge.uiManager.view(forReactTag: node) as? UnityView else {
                print("[UnityViewManager] Could not find UnityView for tag: \(node)")
                return
            }

            unityView.reattachUnityView()
        }
    }
}
