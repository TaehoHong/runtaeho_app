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

class UnityView: UIView {

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
        backgroundColor = .black

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

            do {
                // Unity 시작
                Unity.shared.start()

                // Unity View 가져오기
                if let unityView = Unity.shared.view {
                    self.unityView = unityView

                    // Frame 기반으로 배치 (Aspect Fill을 위해 Auto Layout 사용 안 함)
                    unityView.translatesAutoresizingMaskIntoConstraints = true

                    self.addSubview(unityView)

                    // layoutSubviews에서 Aspect Fill 적용
                    self.setNeedsLayout()

                    self.isUnityLoaded = true

                    // React Native에 로드 완료 알림
                    self.onUnityReady?([
                        "message": "Unity loaded successfully",
                        "timestamp": ISO8601DateFormatter().string(from: Date())
                    ])

                    print("[UnityView] Unity initialized successfully")
                } else {
                    throw NSError(domain: "UnityView", code: 1, userInfo: [
                        NSLocalizedDescriptionKey: "Failed to get Unity view"
                    ])
                }
            } catch {
                print("[UnityView] Failed to initialize Unity: \(error)")

                // React Native에 에러 알림
                self.onUnityError?([
                    "error": error.localizedDescription,
                    "timestamp": ISO8601DateFormatter().string(from: Date())
                ])
            }
        }
    }

    // Unity View 크기 조정 - Aspect Fill 적용
    override func layoutSubviews() {
        super.layoutSubviews()

        guard let unityView = self.unityView else { return }

        // 앱이 활성 상태가 아니면 레이아웃 업데이트 스킵
        guard Unity.shared.isAppActive else {
            print("[UnityView] App not active, skipping layout")
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

        print("[UnityView] Aspect Fill: container=\(containerSize), unity=\(CGSize(width: scaledWidth, height: scaledHeight)), scale=\(fillScale)")
    }

    // MARK: - App Lifecycle Handling

    @objc private func handleUnityDidBecomeActive() {
        print("[UnityView] 📱 Unity did become active notification received (pendingReattach: \(pendingReattach), isUnityLoaded: \(isUnityLoaded))")

        guard isUnityLoaded else {
            print("[UnityView] Unity not loaded, skipping foreground handling")
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

    /// Unity View 안전한 재연결 (CATransaction 충돌 방지)
    private func safeReattachUnityView() {
        // ✅ 메인 스레드 보장
        guard Thread.isMainThread else {
            DispatchQueue.main.async { [weak self] in
                self?.safeReattachUnityView()
            }
            return
        }

        guard isUnityLoaded else {
            print("[UnityView] Unity not loaded, cannot reattach")
            return
        }

        // 앱이 활성 상태가 아니면 reattach 대기
        guard Unity.shared.isSafeToReattach else {
            print("[UnityView] ⏳ Not safe to reattach, queueing for later")
            pendingReattach = true
            return
        }

        // Unity View 참조 확인
        guard let unityView = Unity.shared.view else {
            print("[UnityView] ⚠️ Unity view is nil, cannot reattach")
            return
        }

        // 이미 현재 view에 붙어있으면 스킵
        if unityView.superview == self {
            print("[UnityView] Unity view already attached to this view, skipping reattach")
            return
        }

        // ✅ 기존 CATransaction 완료 대기
        CATransaction.flush()

        // CATransaction을 사용하여 안전하게 view 조작
        CATransaction.begin()
        CATransaction.setDisableActions(true)  // 암시적 애니메이션 비활성화

        // Unity View가 다른 곳에서 옮겨오는 경우인지 확인
        let wasAttachedElsewhere = (unityView.superview != nil)

        // 다른 superview에서 제거
        unityView.removeFromSuperview()

        // 현재 view에 추가
        self.addSubview(unityView)

        // Frame 기반으로 배치 (layoutSubviews에서 Aspect Fill 적용)
        unityView.translatesAutoresizingMaskIntoConstraints = true

        CATransaction.commit()

        // 레이아웃은 CATransaction 완료 후 별도로 처리
        DispatchQueue.main.async { [weak self] in
            self?.setNeedsLayout()
            self?.layoutIfNeeded()
        }

        print("[UnityView] ✅ Unity view reattached safely (wasAttachedElsewhere: \(wasAttachedElsewhere))")

        // 실제로 다른 곳에서 옮겨온 경우에만 React Native에 알림
        if wasAttachedElsewhere {
            self.onUnityReady?([
                "message": "Unity reattached successfully",
                "type": "reattach",
                "timestamp": ISO8601DateFormatter().string(from: Date())
            ])
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
            print("[UnityView] View removed from window")
            return
        }

        guard isUnityLoaded else {
            print("[UnityView] Unity not loaded yet, skipping reattach")
            return
        }

        // 앱이 활성 상태인지 확인 후 reattach
        if Unity.shared.isSafeToReattach {
            print("[UnityView] View added to window, reattaching Unity view")
            safeReattachUnityView()
        } else {
            print("[UnityView] ⏳ View added to window but app not active, queueing reattach")
            pendingReattach = true
        }
    }

    // Unity 정리
    deinit {
        print("[UnityView] Cleaning up Unity view")

        // NotificationCenter 구독 해제
        NotificationCenter.default.removeObserver(self)

        // ✅ 메인 스레드에서 안전하게 정리 - View hierarchy 손상 방지
        let viewToRemove = self.unityView
        DispatchQueue.main.async {
            viewToRemove?.removeFromSuperview()
        }
    }

    // MARK: - Unity 제어 메서드들

    @objc func sendMessageToUnity(_ objectName: String, methodName: String, parameter: String) {
        guard isUnityLoaded else {
            print("[UnityView] Unity not loaded yet")
            return
        }

        Unity.shared.sendMessage(objectName, methodName: methodName, parameter: parameter)
    }

    @objc func pauseUnity() {
        print("[UnityView] Pausing Unity")
        Unity.shared.pause()
    }

    @objc func resumeUnity() {
        print("[UnityView] Resuming Unity")
        Unity.shared.resume()
    }
}
