//
//  RNUnityBridge.swift
//  RunTaeho
//
//  Created by Hong Taeho on 9/23/25.
//  React Native Unity Bridge Module
//

import UIKit
import React

@objc(RNUnityBridge)
class RNUnityBridge: RCTEventEmitter {

    // MARK: - React Native 모듈 설정

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func supportedEvents() -> [String] {
        return [
            "onCharacterStateChanged",
            "onAvatarChanged",
            "onAvatarChangeError",
            "onAnimationComplete",
            "onUnityStatus",
            "onUnityError"
        ]
    }

    // MARK: - React Native에서 호출할 수 있는 메서드들

    /// Unity에 일반 메시지 전송 (순수 브리지)
    @objc
    func sendUnityMessage(_ objectName: String, methodName: String, parameter: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        print("[RNUnityBridge] sendUnityMessage: \(objectName).\(methodName)(\(parameter))")

        DispatchQueue.main.async {
            Unity.shared.sendMessage(objectName, methodName: methodName, parameter: parameter)
            resolve(nil)
        }
    }

    /// Unity에 JSON 데이터 전송 (배열/딕셔너리용)
    @objc
    func sendUnityJSON(_ objectName: String, methodName: String, data: NSArray, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        print("[RNUnityBridge] sendUnityJSON: \(objectName).\(methodName) with \(data.count) items")

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: data, options: [])
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                DispatchQueue.main.async {
                    Unity.shared.sendMessage(objectName, methodName: methodName, parameter: jsonString)
                    resolve(nil)
                }
            } else {
                reject("JSON_ENCODING_ERROR", "Failed to encode JSON to string", nil)
            }
        } catch {
            print("[RNUnityBridge] Error converting data to JSON: \(error)")

            reject("JSON_CONVERSION_ERROR", "Failed to convert data to JSON", error)

            self.sendEvent(withName: "onUnityError", body: [
                "type": "JSON_CONVERSION_ERROR",
                "message": "Failed to convert data to JSON",
                "error": error.localizedDescription
            ])
        }
    }

    // MARK: - React Native 이벤트 시스템

    /// React Native에서 구독 가능한 이벤트 목록
}
