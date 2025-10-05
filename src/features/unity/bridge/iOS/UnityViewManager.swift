import Foundation
import UIKit
import React

@objc(UnityViewManager)
class UnityViewManager: RCTViewManager {

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func view() -> UIView! {
        NSLog("🎯 [UnityViewManager] Creating Unity view")

        // UnityManager에서 Unity rootView 가져오기
        guard let unityRootView = UnityManager.shared.getUnityView() else {
            NSLog("❌ [UnityViewManager] Failed to get Unity view, returning placeholder")
            return createPlaceholderView()
        }

        NSLog("✅ [UnityViewManager] Unity rootView obtained, creating container")

        // 컨테이너 뷰 생성
        let containerView = UnityContainerView()
        containerView.backgroundColor = .black

        // Unity rootView를 컨테이너에 추가
        containerView.setUnityView(unityRootView)

        NSLog("✅ [UnityViewManager] Container view created successfully")
        return containerView
    }

    private func createPlaceholderView() -> UIView {
        let placeholder = UIView()
        placeholder.backgroundColor = .darkGray

        let label = UILabel()
        label.text = "Unity Not Ready"
        label.textColor = .white
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false

        placeholder.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: placeholder.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: placeholder.centerYAnchor)
        ])

        return placeholder
    }
}

// MARK: - Unity Container View

class UnityContainerView: UIView {
    private weak var unityView: UIView?

    func setUnityView(_ view: UIView) {
        NSLog("📦 [UnityContainerView] Setting Unity view")

        // 기존 Unity 뷰 제거
        unityView?.removeFromSuperview()

        // 새 Unity 뷰 설정
        self.unityView = view

        // Unity 뷰를 컨테이너에 추가
        view.frame = self.bounds
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        self.addSubview(view)

        NSLog("📦 [UnityContainerView] Unity view added - container bounds: \(self.bounds), unity frame: \(view.frame)")
    }

    override func layoutSubviews() {
        super.layoutSubviews()

        // 레이아웃이 변경될 때마다 Unity 뷰 크기 강제 동기화
        if let unityView = unityView {
            let oldFrame = unityView.frame
            unityView.frame = self.bounds
            NSLog("📦 [UnityContainerView] layoutSubviews - bounds: \(self.bounds), unity frame: \(oldFrame) → \(unityView.frame)")
        }
    }

    override func didMoveToWindow() {
        super.didMoveToWindow()

        if let window = window {
            NSLog("📦 [UnityContainerView] Added to window - bounds: \(self.bounds)")
        } else {
            NSLog("📦 [UnityContainerView] Removed from window")
        }
    }
}
