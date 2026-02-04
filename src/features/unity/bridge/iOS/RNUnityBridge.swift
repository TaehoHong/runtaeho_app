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

    // MARK: - Avatar Promise Management (Native Promise Hold 방식)
    private var pendingAvatarResolve: RCTPromiseResolveBlock?
    private var pendingAvatarReject: RCTPromiseRejectBlock?
    private var avatarTimeoutTimer: Timer?
    private let AVATAR_TIMEOUT: TimeInterval = 5.0  // 5초 타임아웃

    // MARK: - Character Capture Promise Management
    private var pendingCaptureCallbacks: [String: (RCTPromiseResolveBlock, RCTPromiseRejectBlock)] = [:]
    private let CAPTURE_TIMEOUT: TimeInterval = 5.0  // 5초 타임아웃

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
            "onAvatarReady",    // ★ 아바타(SetSprites) 적용 완료 이벤트
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

        // ★ Avatar Ready (SetSprites 완료) 알림 구독
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAvatarReady),
            name: NSNotification.Name("UnityAvatarReady"),
            object: nil
        )

        // ✅ v8: Unity Metal Ready 알림 구독
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleUnityMetalReady),
            name: Unity.UnityMetalReadyNotification,
            object: nil
        )

        // ★ Character Image Captured 알림 구독 (공유 기능용)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleCharacterImageCaptured),
            name: NSNotification.Name("UnityCharacterImageCaptured"),
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

    // MARK: - Avatar Ready Handler

    /// ★ Avatar(SetSprites) 적용 완료 핸들러
    /// Unity에서 SetSprites() 완료 시 호출됨
    /// Native Promise Hold 방식: pending Promise가 있으면 resolve
    @objc
    private func handleAvatarReady() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            print("[RNUnityBridge] 🎨 Avatar Ready!")

            // ★ Native Promise Hold: Pending Promise resolve
            self.cancelAvatarTimeout()
            if let resolve = self.pendingAvatarResolve {
                print("[RNUnityBridge] ✅ Resolving pending avatar promise")
                resolve(true)
                self.pendingAvatarResolve = nil
                self.pendingAvatarReject = nil
            }

            // 기존 이벤트 전송도 유지 (Store 업데이트용)
            let eventBody: [String: Any] = [
                "ready": true,
                "timestamp": ISO8601DateFormatter().string(from: Date())
            ]

            if self._hasListeners {
                print("[RNUnityBridge] 📤 Sending onAvatarReady event")
                self.sendEvent(withName: "onAvatarReady", body: eventBody)
            } else {
                print("[RNUnityBridge] ⚠️ No listeners for onAvatarReady")
            }
        }
    }

    // MARK: - Avatar Timeout Helper Methods

    private func cancelAvatarTimeout() {
        avatarTimeoutTimer?.invalidate()
        avatarTimeoutTimer = nil
    }

    private func handleAvatarTimeout() {
        print("[RNUnityBridge] ⚠️ Avatar change timeout!")
        if let resolve = pendingAvatarResolve {
            // 타임아웃 시에도 resolve (에러가 아닌 경고)
            resolve(false)
            pendingAvatarResolve = nil
            pendingAvatarReject = nil
        }
    }

    private func rejectAvatar(_ code: String, _ message: String) {
        cancelAvatarTimeout()
        if let reject = pendingAvatarReject {
            reject(code, message, nil)
            pendingAvatarResolve = nil
            pendingAvatarReject = nil
        }
    }

    // MARK: - Character Image Capture Handler

    /// ★ Character Image Captured 핸들러
    /// Unity에서 CaptureCharacter() 완료 시 호출됨
    @objc
    private func handleCharacterImageCaptured(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            guard let userInfo = notification.userInfo,
                  let callbackId = userInfo["callbackId"] as? String,
                  let base64Image = userInfo["base64Image"] as? String else {
                print("[RNUnityBridge] ⚠️ Invalid character image notification")
                return
            }

            print("[RNUnityBridge] 📸 Character image received! callbackId: \(callbackId), imageLength: \(base64Image.count)")

            // Pending Promise 찾아서 resolve
            guard let callbacks = self.pendingCaptureCallbacks.removeValue(forKey: callbackId) else {
                print("[RNUnityBridge] ⚠️ No pending callback for callbackId: \(callbackId)")
                return
            }

            print("[RNUnityBridge] ✅ Resolving capture promise for callbackId: \(callbackId)")
            callbacks.0(base64Image)
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

                // ★ 핵심 수정: 상태가 true로 복원되면 이벤트 재발송
                // 포그라운드 복귀 시 JS Store와 동기화를 위해 이벤트 재발송
                if self._hasListeners {
                    print("[RNUnityBridge] 📤 Re-sending onCharactorReady event after reset recovery")
                    self.sendEvent(withName: "onCharactorReady", body: [
                        "ready": true,
                        "source": "reset_recovery",
                        "timestamp": ISO8601DateFormatter().string(from: Date())
                    ])
                }
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

    // MARK: - Native Promise Hold (Avatar Change And Wait)

    /// ★ 아바타 변경 후 완료까지 대기 (Native Promise Hold 방식)
    /// SetSprites 완료 시 Unity에서 _notifyAvatarReady() 호출 → handleAvatarReady에서 resolve
    @objc
    func changeAvatarAndWait(_ objectName: String, methodName: String, data: String,
                             resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        print("[RNUnityBridge] changeAvatarAndWait: \(objectName).\(methodName)")

        // 이전 pending Promise 정리 (연속 호출 시)
        if let prevReject = pendingAvatarReject {
            print("[RNUnityBridge] ⚠️ Cancelling previous avatar change request")
            prevReject("CANCELLED", "New avatar change request", nil)
        }
        cancelAvatarTimeout()

        // 새 Promise 저장
        pendingAvatarResolve = resolve
        pendingAvatarReject = reject

        // 타임아웃 설정 (5초)
        avatarTimeoutTimer = Timer.scheduledTimer(withTimeInterval: AVATAR_TIMEOUT, repeats: false) { [weak self] _ in
            self?.handleAvatarTimeout()
        }

        // Unity에 메시지 전송
        DispatchQueue.main.async {
            Unity.shared.sendMessage(objectName, methodName: methodName, parameter: data)
            // ★ 여기서 resolve하지 않음! handleAvatarReady에서 resolve
            print("[RNUnityBridge] 📤 SetSprites message sent, waiting for Avatar Ready...")
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

    // MARK: - Background Control (공유 에디터용)

    /// ★ Unity 배경 이미지 변경
    /// BackgroundImage.SetBackground() 호출
    @objc
    func setBackground(_ backgroundId: String,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
        print("[RNUnityBridge] setBackground: \(backgroundId)")

        DispatchQueue.main.async {
            Unity.shared.sendMessage("Background", methodName: "SetBackground", parameter: backgroundId)
            resolve(nil)
        }
    }

    /// ★ Unity 배경 색상 변경 (단색)
    /// BackgroundImage.SetBackgroundColor() 호출
    @objc
    func setBackgroundColor(_ colorHex: String,
                            resolver resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
        print("[RNUnityBridge] setBackgroundColor: \(colorHex)")

        DispatchQueue.main.async {
            Unity.shared.sendMessage("Background", methodName: "SetBackgroundColor", parameter: colorHex)
            resolve(nil)
        }
    }

    /// ★ Unity 배경을 사용자 사진으로 변경
    /// BackgroundImage.SetBackgroundFromBase64() 호출
    /// @param base64Image Base64 인코딩된 이미지 문자열
    @objc
    func setBackgroundFromPhoto(_ base64Image: String,
                                resolver resolve: @escaping RCTPromiseResolveBlock,
                                rejecter reject: @escaping RCTPromiseRejectBlock) {
        print("[RNUnityBridge] setBackgroundFromPhoto (length: \(base64Image.count))")

        DispatchQueue.main.async {
            Unity.shared.sendMessage("Background", methodName: "SetBackgroundFromBase64", parameter: base64Image)
            resolve(nil)
        }
    }

    // MARK: - Character Capture (공유 기능용)

    /// ★ Unity 캐릭터 스크린샷 캡처
    /// 현재 착용 중인 아이템이 반영된 캐릭터를 PNG로 캡처
    /// @returns Base64 인코딩된 PNG 이미지
    @objc
    func captureCharacter(_ resolver: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
        print("[RNUnityBridge] captureCharacter called")

        // 고유 callbackId 생성
        let callbackId = UUID().uuidString

        // Promise 저장
        pendingCaptureCallbacks[callbackId] = (resolver, reject)

        // Unity에 캡처 요청
        DispatchQueue.main.async {
            Unity.shared.sendMessage(
                "Charactor",
                methodName: "CaptureCharacter",
                parameter: callbackId
            )
            print("[RNUnityBridge] 📤 CaptureCharacter message sent to Unity (callbackId: \(callbackId))")
        }

        // 5초 타임아웃 설정
        DispatchQueue.main.asyncAfter(deadline: .now() + self.CAPTURE_TIMEOUT) { [weak self] in
            guard let self = self else { return }

            // 아직 pending 상태면 타임아웃 처리
            if let callbacks = self.pendingCaptureCallbacks.removeValue(forKey: callbackId) {
                print("[RNUnityBridge] ⚠️ Character capture timeout for callbackId: \(callbackId)")
                callbacks.1("TIMEOUT", "Character capture timed out after \(self.CAPTURE_TIMEOUT) seconds", nil)
            }
        }
    }

}
