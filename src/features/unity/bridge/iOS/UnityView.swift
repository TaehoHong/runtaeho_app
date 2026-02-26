//
//  UnityView.swift
//  app
//
//  Created by Hong Taeho on 9/23/25.
//  React Native Unity View Container
//

import UIKit
import React
import UnityFramework

class RNUnityContainerView: UIView {

    // Unity 관련 속성들
    private var unityView: UIView?
    private var isUnityLoaded = false

    // Reattach 대기 상태 관리
    private var pendingReattach = false

    // React Native 이벤트 콜백들
    @objc var onUnityReady: RCTDirectEventBlock?
    @objc var onUnityError: RCTDirectEventBlock?
    @objc var onCharacterStateChanged: RCTDirectEventBlock?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUnityView()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUnityView()
    }

    private func setupUnityView() {
        // 검정 배경 노출을 피하기 위해 투명 배경 사용
        backgroundColor = .clear

        // Container 밖으로 나가는 부분 잘라내기 (Aspect Fill)
        clipsToBounds = true

        // 앱 활성화 알림 구독 (Background → Foreground 복귀 시)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleUnityDidBecomeActive),
            name: NSNotification.Name("UnityDidBecomeActive"),
            object: nil
        )

        // Unity 초기화
        initializeUnity()
    }

    private func initializeUnity() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let isReusePath = Unity.shared.loaded

            print("[RNUnityContainerView] === 동기적 초기화 시작 ===")

            if isReusePath {
                print("[RNUnityContainerView] ⚡ Reuse path detected, skipping Unity.start()")
                self.fastPathAttachReusedUnityView()
                return
            }

            // ✅ Step 1: Unity 시작 및 Metal 준비 대기
            self.step1_startUnity { [weak self] success in
                guard let self = self, success else {
                    print("[RNUnityContainerView] ❌ Step 1 실패: Unity 시작 실패")
                    self?.onUnityError?(["error": "Unity start failed"])
                    return
                }

                // ✅ Step 2: Unity view를 hidden 상태로 attach
                self.step2_attachUnityView { [weak self] success in
                    guard let self = self, success else {
                        print("[RNUnityContainerView] ❌ Step 2 실패: Attach 실패")
                        self?.onUnityError?(["error": "Attach failed"])
                        return
                    }

                    // ✅ Step 3: CAMetalLayer 설정
                    self.step3_configureMetalLayer { [weak self] success in
                        guard let self = self else { return }

                        if !success {
                            print("[RNUnityContainerView] ⚠️ Step 3 경고: Metal layer 설정 실패")
                            // 계속 진행 (치명적이지 않음)
                        }

                        // ✅ Step 4: Unity view 표시
                        self.step4_showUnityView()
                    }
                }
            }
        }
    }

    // MARK: - 초기화 단계별 메서드 (v8)

    /// Step 1: Unity 시작 및 Metal 준비 대기
    private func step1_startUnity(completion: @escaping (Bool) -> Void) {
        print("[RNUnityContainerView] Step 1: Unity 시작 중...")

        Unity.shared.start { ready in
            if ready {
                print("[RNUnityContainerView] Step 1: ✅ Unity 및 Metal 준비 완료")
            } else {
                print("[RNUnityContainerView] Step 1: ⚠️ Metal 준비 타임아웃, 계속 진행")
            }
            completion(true)  // Metal 타임아웃이어도 계속 진행
        }
    }

    /// Step 2: Unity view를 hidden 상태로 attach
    private func step2_attachUnityView(completion: @escaping (Bool) -> Void) {
        print("[RNUnityContainerView] Step 2: Unity view attach 중...")

        guard Unity.shared.isAppActive else {
            print("[RNUnityContainerView] Step 2: ⚠️ App not active")
            completion(false)
            return
        }

        UnityViewContainer.shared.attachUnityView(to: self) { [weak self] success in
            guard let self = self, success else {
                completion(false)
                return
            }

            // Unity view를 hidden 상태로 설정
            self.unityView = Unity.shared.view
            self.unityView?.isHidden = true
            self.unityView?.layer.opacity = 0

            print("[RNUnityContainerView] Step 2: ✅ Unity view attached (hidden)")
            completion(true)
        }
    }

    /// Step 3: CAMetalLayer 설정
    private func step3_configureMetalLayer(completion: @escaping (Bool) -> Void) {
        print("[RNUnityContainerView] Step 3: CAMetalLayer 설정 중...")

        guard let unityView = self.unityView else {
            completion(false)
            return
        }

        var foundCount = 0
        configureMetalLayersRecursively(in: unityView.layer, foundCount: &foundCount)

        if foundCount > 0 {
            print("[RNUnityContainerView] Step 3: ✅ \(foundCount)개 CAMetalLayer 설정 완료")
            completion(true)
        } else {
            print("[RNUnityContainerView] Step 3: ⚠️ CAMetalLayer 없음")
            completion(false)
        }
    }

    /// Step 4: Unity view 표시
    private func step4_showUnityView() {
        print("[RNUnityContainerView] Step 4: Unity view 표시 중...")

        guard Unity.shared.isAppActive else {
            print("[RNUnityContainerView] Step 4: ⚠️ App not active, skipping show")
            return
        }

        // 애니메이션 없이 표시
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        self.unityView?.isHidden = false
        self.unityView?.layer.opacity = 1
        CATransaction.commit()

        self.isUnityLoaded = true
        self.setNeedsLayout()

        print("[RNUnityContainerView] Step 4: ✅ Unity view 표시 완료")
        print("[RNUnityContainerView] === 동기적 초기화 완료 ===")

        emitUnityReadyEvent(message: "Unity loaded successfully")
    }

    /// 재사용 경로 fast-path:
    /// 이미 로드된 Unity는 hidden/show 단계 없이 즉시 attach + layout + ready 통지
    private func fastPathAttachReusedUnityView() {
        print("[RNUnityContainerView] ⚡ Fast-path: reusing loaded Unity view")

        guard Unity.shared.isAppActive else {
            print("[RNUnityContainerView] ⚠️ Fast-path skipped: app not active")
            pendingReattach = true
            return
        }

        UnityViewContainer.shared.attachUnityView(to: self) { [weak self] success in
            guard let self = self, success else {
                print("[RNUnityContainerView] ❌ Fast-path attach failed")
                self?.onUnityError?(["error": "Attach failed"])
                return
            }

            self.unityView = Unity.shared.view
            self.unityView?.isHidden = false
            self.unityView?.layer.opacity = 1
            self.isUnityLoaded = true
            self.setNeedsLayout()
            self.layoutIfNeeded()

            print("[RNUnityContainerView] ✅ Fast-path attach complete")
            self.emitUnityReadyEvent(message: "Unity reattached successfully", type: "reattach")
        }
    }

    private func emitUnityReadyEvent(message: String, type: String? = nil) {
        var payload: [String: Any] = [
            "message": message,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]

        if let type = type {
            payload["type"] = type
        }

        onUnityReady?(payload)
    }

    // Unity View 크기 조정 - Aspect Fill 적용
    override func layoutSubviews() {
        super.layoutSubviews()

        guard let unityView = self.unityView else { return }

        // 앱이 활성 상태가 아니면 레이아웃 업데이트 스킵
        guard Unity.shared.isAppActive else {
            print("[RNUnityContainerView] App not active, skipping layout")
            return
        }

        // Container 크기
        let containerSize = bounds.size
        guard containerSize.width > 0 && containerSize.height > 0 else { return }

        // Unity의 고유 렌더링 크기 (Canvas 기준)
        // CanvasScaler: ReferenceResolution 800x600, MatchWidthOrHeight 0 (width 기준)
        // Unity가 실제로 렌더링하는 크기를 추정
        let unityRenderSize = CGSize(width: 600, height: 600)

        // Aspect Fill 계산: 더 큰 scale을 사용하여 container를 채움
        let widthScale = containerSize.width / unityRenderSize.width
        let heightScale = containerSize.height / unityRenderSize.height
        // let fillScale = max(widthScale, heightScale) // Aspect Fill: 큰 쪽 사용 (기존)

        // Container의 긴 쪽 dimension 기준으로 scale 선택
        let fillScale: CGFloat
        if containerSize.width >= containerSize.height {
            fillScale = widthScale  // width가 더 길면 width 기준
        } else {
            fillScale = heightScale  // height가 더 길면 height 기준
        }

        // Unity View 크기 (확대됨)
        let scaledWidth = unityRenderSize.width * fillScale
        let scaledHeight = unityRenderSize.height * fillScale

        // 정렬: 좌우 중앙, 아래쪽에 붙임
        let x = (containerSize.width - scaledWidth) / 2
        let y = containerSize.height - scaledHeight

        // Frame 설정 (clipsToBounds로 넘치는 부분 자름)
        unityView.frame = CGRect(x: x, y: y, width: scaledWidth, height: scaledHeight)

        print("[RNUnityContainerView] Aspect Fill: container=\(containerSize), unity=\(CGSize(width: scaledWidth, height: scaledHeight)), scale=\(fillScale)")
    }

    // MARK: - App Lifecycle Handling

    @objc private func handleUnityDidBecomeActive() {
        print("[RNUnityContainerView] 📱 Unity did become active notification received (pendingReattach: \(pendingReattach), isUnityLoaded: \(isUnityLoaded))")

        guard isUnityLoaded else {
            print("[RNUnityContainerView] Unity not loaded, skipping foreground handling")
            return
        }

        // Pending reattach가 있으면 실행
        if pendingReattach {
            pendingReattach = false
            safeReattachUnityView()
        } else {
            // Reattach가 필요 없어도 레이아웃 업데이트는 필요할 수 있음
            // (Background에서 layoutSubviews가 스킵되었을 수 있음)
            DispatchQueue.main.async { [weak self] in
                self?.setNeedsLayout()
                self?.layoutIfNeeded()
            }
        }
    }

    // MARK: - Safe View Reattachment

    /// Unity View 안전한 재연결 (UnityViewContainer 사용)
    private func safeReattachUnityView() {
        // ✅ 메인 스레드 보장
        guard Thread.isMainThread else {
            DispatchQueue.main.async { [weak self] in
                self?.safeReattachUnityView()
            }
            return
        }

        guard isUnityLoaded else {
            print("[RNUnityContainerView] Unity not loaded, cannot reattach")
            return
        }

        // 앱이 활성 상태가 아니면 reattach 대기
        guard Unity.shared.isSafeToReattach else {
            print("[RNUnityContainerView] ⏳ Not safe to reattach, queueing for later")
            pendingReattach = true
            return
        }

        // 이미 현재 view에 붙어있으면 스킵
        if UnityViewContainer.shared.isAttached(to: self) {
            print("[RNUnityContainerView] Unity view already attached to this view, skipping reattach")
            self.unityView = Unity.shared.view
            self.setNeedsLayout()
            self.layoutIfNeeded()
            emitUnityReadyEvent(message: "Unity already attached", type: "reattach")
            return
        }

        // ✅ UnityViewContainer를 통한 안전한 재연결 (CATransaction 제거)
        UnityViewContainer.shared.attachUnityView(to: self) { [weak self] success in
            guard let self = self, success else {
                print("[RNUnityContainerView] ⚠️ Failed to reattach Unity view via Container")
                return
            }

            // Unity view 참조 업데이트
            self.unityView = Unity.shared.view

            // 레이아웃 업데이트
            self.setNeedsLayout()
            self.layoutIfNeeded()

            print("[RNUnityContainerView] ✅ Unity view reattached via Container")

            // React Native에 알림
            self.emitUnityReadyEvent(message: "Unity reattached successfully", type: "reattach")
        }
    }

    // Unity View 재연결 (다른 화면에서 사용 후 돌아올 때) - 기존 메서드 유지
    func reattachUnityView() {
        safeReattachUnityView()
    }

    // 화면에 나타날 때
    override func didMoveToWindow() {
        super.didMoveToWindow()

        guard window != nil else {
            print("[RNUnityContainerView] View removed from window")
            return
        }

        guard isUnityLoaded else {
            print("[RNUnityContainerView] Unity not loaded yet, skipping reattach")
            return
        }

        // 앱이 활성 상태인지 확인 후 reattach
        if Unity.shared.isSafeToReattach {
            print("[RNUnityContainerView] View added to window, reattaching Unity view")
            safeReattachUnityView()
        } else {
            print("[RNUnityContainerView] ⏳ View added to window but app not active, queueing reattach")
            pendingReattach = true
        }
    }

    // MARK: - Metal Layer Configuration

    /// 재귀적으로 모든 sublayer에서 CAMetalLayer 찾아 설정 (v8)
    private func configureMetalLayersRecursively(in layer: CALayer, foundCount: inout Int) {
        if let metalLayer = layer as? CAMetalLayer {
            metalLayer.presentsWithTransaction = true
            foundCount += 1
            print("[RNUnityContainerView] CAMetalLayer configured at depth \(foundCount)")
        }

        layer.sublayers?.forEach { sublayer in
            configureMetalLayersRecursively(in: sublayer, foundCount: &foundCount)
        }
    }

    // Unity 정리
    deinit {
        print("[RNUnityContainerView] Cleaning up Unity view")

        // NotificationCenter 구독 해제
        NotificationCenter.default.removeObserver(self)

        // ✅ Unity view 제거 안 함 - UnityViewContainer가 관리
        // 다른 UnityView 인스턴스가 재사용할 수 있도록 Unity.shared.view는 유지
        // Container가 소유권을 단일 지점에서 관리하므로 안전
    }

    // MARK: - Unity 제어 메서드들

    @objc func sendMessageToUnity(_ objectName: String, methodName: String, parameter: String) {
        guard isUnityLoaded else {
            print("[RNUnityContainerView] Unity not loaded yet")
            return
        }

        Unity.shared.sendMessage(objectName, methodName: methodName, parameter: parameter)
    }

    @objc func pauseUnity() {
        print("[RNUnityContainerView] Pausing Unity")
        Unity.shared.pause()
    }

    @objc func resumeUnity() {
        print("[RNUnityContainerView] Resuming Unity")
        Unity.shared.resume()
    }
}
