//
//  RNUnityBridge.swift
//  RunTaeho
//
//  Created by Hong Taeho on 9/23/25.
//  React Native Unity Bridge Module
//
//  Architecture: Push + Pull Pattern
//  - Push: 이벤트 발생 시 즉시 알림 (리스너 있을 때)
//  - Pull: 언제든 현재 상태 조회 가능
//  - Buffer: 리스너 없을 때 이벤트 보관 후 나중에 발송
//

import UIKit
import React

@objc(RNUnityBridge)
class RNUnityBridge: RCTEventEmitter {

    // MARK: - Singleton for state management

    @objc static var shared: RNUnityBridge?

    // MARK: - State (Single Source of Truth)

    private var _isCharactorReady: Bool = false
    private var pendingEvents: [[String: Any]] = []

    // MARK: - Thread-Safe Listener Flag
    private let listenerLock = NSLock()
    private var _hasListenersInternal: Bool = false
    private var _hasListeners: Bool {
        get {
            listenerLock.lock()
            defer { listenerLock.unlock() }
            return _hasListenersInternal
        }
        set {
            listenerLock.lock()
            _hasListenersInternal = newValue
            listenerLock.unlock()
        }
    }

    // MARK: - React Native 모듈 설정

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func supportedEvents() -> [String]! {
        return [
            "onUnityError",
            "onCharactorReady",
            "UnityEngineReady"  // ✅ v8: Metal context 준비 완료 이벤트
        ]
    }

    // MARK: - Lifecycle

    override init() {
        super.init()
        RNUnityBridge.shared = self

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleCharactorReady),
            name: NSNotification.Name("UnityCharactorReady"),
            object: nil
        )

        // ✅ v8: Unity Metal Ready 알림 구독
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleUnityMetalReady),
            name: Unity.UnityMetalReadyNotification,
            object: nil
        )

        print("[RNUnityBridge] ✅ Initialized")
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
        RNUnityBridge.shared = nil
    }

    // MARK: - RCTEventEmitter Listener Management

    override func startObserving() {
        _hasListeners = true
        print("[RNUnityBridge] 👂 Listeners started, pending: \(pendingEvents.count)")
        flushPendingEvents()
    }

    override func stopObserving() {
        _hasListeners = false
        print("[RNUnityBridge] 🔇 Listeners stopped")
    }

    // MARK: - Event Handling

    // ✅ v8: Unity Metal Ready 핸들러
    @objc
    private func handleUnityMetalReady() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            print("[RNUnityBridge] 📱 Unity Metal ready, sending event to JS")

            guard self._hasListeners else {
                print("[RNUnityBridge] ⚠️ No JS listeners for UnityEngineReady")
                return
            }

            self.sendEvent(withName: "UnityEngineReady", body: [
                "ready": true,
                "timestamp": ISO8601DateFormatter().string(from: Date())
            ])
        }
    }

    @objc
    private func handleCharactorReady() {
        // ✅ 메인 스레드 보장 - EXC_BAD_ACCESS 크래시 방지
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            print("[RNUnityBridge] 🎉 Charactor Ready!")
            self._isCharactorReady = true

            let eventBody: [String: Any] = [
                "ready": true,
                "timestamp": ISO8601DateFormatter().string(from: Date())
            ]

            if self._hasListeners {
                print("[RNUnityBridge] 📤 Sending event immediately (main thread)")
                self.sendEvent(withName: "onCharactorReady", body: eventBody)
            } else {
                print("[RNUnityBridge] 📦 Buffering event (no listeners)")
                self.pendingEvents.append(eventBody)
            }
        }
    }

    private func flushPendingEvents() {
        guard !pendingEvents.isEmpty else { return }
        for event in pendingEvents {
            print("[RNUnityBridge] 📤 Flushing buffered event")
            sendEvent(withName: "onCharactorReady", body: event)
        }
        pendingEvents.removeAll()
    }

    // MARK: - State Query (Pull Pattern)

    @objc
    func isCharactorReady(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        print("[RNUnityBridge] 🔍 isCharactorReady: \(_isCharactorReady)")
        resolve(_isCharactorReady)
    }

    @objc
    func resetCharactorReady(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        print("[RNUnityBridge] 🔄 Reset Ready state")
        _isCharactorReady = false
        pendingEvents.removeAll()

        // ★ 핵심: 실제 Unity 상태 확인 후 동기화
        // Unity가 이미 준비되어 있으면 상태 유지 (View가 존재하면 준비된 것으로 간주)
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                resolve(nil)
                return
            }

            if Unity.shared.view != nil {
                self._isCharactorReady = true
                print("[RNUnityBridge] ⚠️ Unity already ready, keeping state true")
            }

            resolve(nil)
        }
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

    // MARK: - Unity State Validation

    /// Unity 상태 유효성 검사
    @objc
    func validateUnityState(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            let isValid = Unity.shared.validateState()
            print("[RNUnityBridge] validateUnityState: \(isValid)")
            resolve(isValid)
        }
    }

    /// Unity 강제 리셋 (stale 상태 복구용)
    @objc
    func forceResetUnity(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                reject("SELF_NIL", "RNUnityBridge deallocated", nil)
                return
            }

            print("[RNUnityBridge] 🔄 Force reset requested")

            // Unity 리셋
            Unity.shared.forceReset()

            // Bridge 상태도 리셋
            self._isCharactorReady = false
            self.pendingEvents.removeAll()

            resolve(nil)
        }
    }

    // MARK: - v8: Unity Engine Ready Methods

    /// ✅ Unity Engine 준비 상태 확인
    @objc
    func isEngineReady(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            let ready = Unity.shared.loaded && Unity.shared.isAppActive
            print("[RNUnityBridge] isEngineReady: \(ready)")
            resolve(ready)
        }
    }

    /// ✅ Unity Engine 초기화 요청 (JS에서 호출 가능)
    @objc
    func initializeUnityEngine(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        print("[RNUnityBridge] initializeUnityEngine called")

        DispatchQueue.main.async {
            Unity.shared.start { ready in
                if ready {
                    print("[RNUnityBridge] ✅ Unity initialized successfully")
                    resolve(true)
                } else {
                    print("[RNUnityBridge] ⚠️ Unity initialization timeout")
                    resolve(false)  // 에러가 아닌 false 반환 (타임아웃)
                }
            }
        }
    }

}
