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

    // Unity View 재연결 (다른 화면에서 사용 후 돌아올 때)
    func reattachUnityView() {
        guard isUnityLoaded else {
            print("[UnityView] Unity not loaded, cannot reattach")
            return
        }

        // Unity View가 이미 현재 view에 붙어있으면 스킵 (불필요한 이벤트 방지)
        if let unityView = Unity.shared.view {
            if unityView.superview == self {
                print("[UnityView] Unity view already attached to this view, skipping reattach")
                return
            }

            // Unity View가 다른 곳에서 옮겨오는 경우인지 확인
            let wasAttachedElsewhere = (unityView.superview != nil)

            // 다른 superview에서 제거
            unityView.removeFromSuperview()

            // 현재 view에 추가
            self.addSubview(unityView)

            // Frame 기반으로 배치 (layoutSubviews에서 Aspect Fill 적용)
            unityView.translatesAutoresizingMaskIntoConstraints = true
            self.setNeedsLayout()

            print("[UnityView] Unity view reattached successfully (wasAttachedElsewhere: \(wasAttachedElsewhere))")

            // 실제로 다른 곳에서 옮겨온 경우에만 React Native에 알림
            // (같은 view 내에서 재배치되는 경우 이벤트 발생 안 함)
            if wasAttachedElsewhere {
                self.onUnityReady?([
                    "message": "Unity reattached successfully",
                    "type": "reattach",
                    "timestamp": ISO8601DateFormatter().string(from: Date())
                ])
            } else {
                print("[UnityView] Unity view was not attached elsewhere, skipping event")
            }
        }
    }

    // 화면에 나타날 때
    override func didMoveToWindow() {
        super.didMoveToWindow()

        // 화면에 추가될 때 Unity View 재연결
        if window != nil && isUnityLoaded {
            print("[UnityView] View added to window, reattaching Unity view")
            reattachUnityView()
        }
    }

    // Unity 정리
    deinit {
        print("[UnityView] Cleaning up Unity view")
        // Unity View는 제거하지 않음 - 다른 화면에서 사용할 수 있음
        // unityView?.removeFromSuperview()
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
        // Unity 일시정지 로직
        print("[UnityView] Pausing Unity")
    }

    @objc func resumeUnity() {
        // Unity 재개 로직
        print("[UnityView] Resuming Unity")
    }
}
