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
                    self.addSubview(unityView)

                    // 제약 조건 설정
                    unityView.translatesAutoresizingMaskIntoConstraints = false
                    NSLayoutConstraint.activate([
                        unityView.topAnchor.constraint(equalTo: self.topAnchor),
                        unityView.leftAnchor.constraint(equalTo: self.leftAnchor),
                        unityView.rightAnchor.constraint(equalTo: self.rightAnchor),
                        unityView.bottomAnchor.constraint(equalTo: self.bottomAnchor)
                    ])

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

    // Unity View 크기 조정
    override func layoutSubviews() {
        super.layoutSubviews()
        unityView?.frame = bounds
    }

    // Unity 정리
    deinit {
        print("[UnityView] Cleaning up Unity view")
        unityView?.removeFromSuperview()
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
