//
//  UnityViewContainer.swift
//  app
//
//  Created by Hong Taeho on 1/21/26.
//  Unity View 소유권 관리를 위한 싱글톤 컨테이너
//  Cold Start 크래시 근본 해결: 여러 UnityView 인스턴스가 동시에 Unity.shared.view를 조작하는 문제 방지
//

import UIKit

/// Unity view의 소유권을 단일 지점에서 관리하는 싱글톤 컨테이너
/// 여러 UnityView 인스턴스가 동시에 Unity.shared.view를 조작할 때 발생하는 race condition 방지
class UnityViewContainer {
    static let shared = UnityViewContainer()

    /// 현재 Unity view가 붙어있는 superview
    private weak var currentSuperview: UIView?

    /// 동시 접근 방지를 위한 Lock
    private let lock = NSLock()

    /// attach 작업 진행 중 여부
    private var isAttaching = false

    private init() {
        print("[UnityViewContainer] Singleton initialized")
    }

    /// Unity view를 새 superview로 안전하게 이동
    /// - Parameters:
    ///   - superview: Unity view를 추가할 새 superview
    ///   - completion: 완료 콜백 (성공 여부)
    func attachUnityView(to superview: UIView, completion: @escaping (Bool) -> Void) {
        // 메인 스레드에서만 실행
        guard Thread.isMainThread else {
            DispatchQueue.main.async { [weak self] in
                self?.attachUnityView(to: superview, completion: completion)
            }
            return
        }

        lock.lock()

        // 이미 attach 작업 진행 중이면 대기
        if isAttaching {
            lock.unlock()
            print("[UnityViewContainer] Already attaching, queueing request")

            // 다음 RunLoop에서 재시도
            DispatchQueue.main.async { [weak self] in
                self?.attachUnityView(to: superview, completion: completion)
            }
            return
        }

        isAttaching = true
        lock.unlock()

        // Unity view 가져오기
        guard let unityView = Unity.shared.view else {
            print("[UnityViewContainer] Unity view is nil")
            lock.lock()
            isAttaching = false
            lock.unlock()
            completion(false)
            return
        }

        // 이미 같은 곳에 붙어있으면 스킵
        if unityView.superview === superview {
            print("[UnityViewContainer] Unity view already attached to this superview, skipping")
            lock.lock()
            isAttaching = false
            lock.unlock()
            completion(true)
            return
        }

        print("[UnityViewContainer] Attaching Unity view to new superview (previous: \(String(describing: unityView.superview)))")

        // 이전 superview에서 제거 (동기적으로)
        unityView.removeFromSuperview()

        // Frame 기반으로 배치
        unityView.translatesAutoresizingMaskIntoConstraints = true

        // 새 superview에 추가
        superview.addSubview(unityView)

        // 현재 superview 업데이트
        lock.lock()
        currentSuperview = superview
        isAttaching = false
        lock.unlock()

        print("[UnityViewContainer] Unity view attached successfully")
        completion(true)
    }

    /// Unity view를 현재 superview에서 분리
    /// 참고: 일반적으로 호출하지 않음 - 다른 UnityView가 재사용할 수 있도록 남겨둠
    func detachUnityView() {
        guard Thread.isMainThread else {
            DispatchQueue.main.async { [weak self] in
                self?.detachUnityView()
            }
            return
        }

        lock.lock()
        defer { lock.unlock() }

        Unity.shared.view?.removeFromSuperview()
        currentSuperview = nil

        print("[UnityViewContainer] Unity view detached")
    }

    /// Unity view가 특정 superview에 붙어있는지 확인
    func isAttached(to superview: UIView) -> Bool {
        lock.lock()
        defer { lock.unlock() }

        guard let unityView = Unity.shared.view else {
            return false
        }

        return unityView.superview === superview
    }

    /// 현재 Unity view의 superview 반환
    var currentAttachment: UIView? {
        lock.lock()
        defer { lock.unlock() }

        return currentSuperview
    }
}
