//
//  UnityBridgeService.swift
//  RunTaeho
//
//  Unity 메시지 전송 서비스 래퍼
//  순수 브리지 역할 - 도메인 로직 없음
//

import Foundation

class UnityBridgeService {

    static let shared = UnityBridgeService()

    private init() {}

    /// Unity에 메시지 전송 (순수 브리지)
    func sendUnityMessage(objectName: String, methodName: String, parameter: String) {
        print("[UnityBridgeService] Sending Unity message: \(objectName).\(methodName)(\(parameter))")
        Unity.shared.sendMessage(objectName, methodName: methodName, parameter: parameter)
    }

    /// Unity에 JSON 데이터 전송 (순수 브리지)
    func sendUnityJSON(objectName: String, methodName: String, jsonString: String) {
        print("[UnityBridgeService] Sending Unity JSON: \(objectName).\(methodName)")
        Unity.shared.sendMessage(objectName, methodName: methodName, parameter: jsonString)
    }
}
