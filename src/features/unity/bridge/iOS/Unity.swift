//
//  Unity.swift
//  RunTaeho
//
//  Unity Framework 관리 및 메시지 전송
//

import MetalKit
import UnityFramework

class Unity: ObservableObject  {
    /* UnityFramework's principal class is implemented as a singleton
       so we will do the same. Singleton init is lazy and thread safe. */
    static let shared = Unity()

    // MARK: - Notifications
    /// Unity Metal context 준비 완료 신호 (Event-Driven 패턴용)
    static let UnityMetalReadyNotification = NSNotification.Name("UnityMetalReady")

    // MARK: Lifecycle
    private let frameworkPath: String = "/Frameworks/UnityFramework.framework"

    /// Unity가 완전히 로드되어 사용 가능한 상태인지
    private(set) var loaded = false

    /// UnityFramework 인스턴스 (lazy - start() 호출 시에만 초기화)
    private var _framework: UnityFramework?
    private var framework: UnityFramework {
        if _framework == nil {
            _framework = loadFramework()
        }
        return _framework!
    }

    /// Framework가 초기화되었는지 여부 (start() 전에는 false)
    private var isFrameworkInitialized: Bool {
        return _framework != nil
    }

    private let queueLock = NSLock()
    private var messageQueue: [(objectName: String, methodName: String, parameter: String)] = []
    private var isGameObjectReady = false

    /// 메시지 큐 최대 크기 (메모리 보호)
    private let maxQueueSize = 50

    // MARK: - App Lifecycle State
    /// 앱이 활성 상태인지 여부 (Background/Foreground 추적)
    private(set) var isAppActive = true

    /// Unity가 일시정지 상태인지 여부
    private(set) var isPaused = false

    /// View reattach가 안전한지 여부
    var isSafeToReattach: Bool {
        return loaded && isAppActive && !isPaused
    }

    private init() {
        // ⚠️ 중요: init()에서는 UnityFramework를 로드하지 않음
        // start()가 호출될 때까지 지연 초기화

        // 앱 생명주기 옵저버 등록
        setupAppLifecycleObservers()

        print("[Unity] Singleton initialized (framework not loaded yet)")
    }

    /// UnityFramework 로드 (lazy initialization)
    private func loadFramework() -> UnityFramework {
        print("[Unity] Loading UnityFramework...")

        let bundlePath = Bundle.main.bundlePath + self.frameworkPath
        let bundle = Bundle(path: bundlePath)

        if bundle?.isLoaded == false {
            bundle?.load()
        }

        guard let principalClass = bundle?.principalClass,
              let frameworkInstance = principalClass.getInstance() as? UnityFramework else {
            fatalError("[Unity] Failed to load UnityFramework")
        }

        let executeHeader = #dsohandle.assumingMemoryBound(to: MachHeader.self)
        frameworkInstance.setExecuteHeader(executeHeader)
        frameworkInstance.setDataBundleId("com.unity3d.framework")

        print("[Unity] UnityFramework loaded successfully")

        return frameworkInstance
    }

    // MARK: - App Lifecycle Observers

    private func setupAppLifecycleObservers() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppWillResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppWillEnterForeground),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }

    @objc private func handleAppWillResignActive() {
        print("[Unity] 📱 App will resign active - starting safe cleanup (loaded: \(loaded), frameworkInit: \(isFrameworkInitialized))")
        isAppActive = false

        // Unity가 로드되지 않았으면 아무것도 하지 않음
        guard loaded && isFrameworkInitialized else {
            print("[Unity] Unity not loaded, skipping pause")
            return
        }

        // ✅ CATransaction 기반 안전한 pause
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        CATransaction.setCompletionBlock { [weak self] in
            guard let self = self else { return }
            print("[Unity] ✅ Background CATransaction completed")
        }

        // Pending 작업 완료
        CATransaction.flush()

        // Unity pause
        self.pause()

        CATransaction.commit()
    }

    @objc private func handleAppDidEnterBackground() {
        print("[Unity] 📱 App did enter background (loaded: \(loaded), frameworkInit: \(isFrameworkInitialized))")
        isAppActive = false

        // Unity가 로드되지 않았으면 아무것도 하지 않음
        guard loaded && isFrameworkInitialized else {
            print("[Unity] Unity not loaded, skipping background handling")
            return
        }

        // Background에서는 Unity 렌더링 완전 중단
        // Metal/OpenGL 컨텍스트가 invalid 상태가 되므로 안전하게 정리
        CATransaction.flush()
    }

    @objc private func handleAppWillEnterForeground() {
        print("[Unity] 📱 App will enter foreground (loaded: \(loaded), frameworkInit: \(isFrameworkInitialized))")
        // 아직 active는 아님 - didBecomeActive에서 처리
    }

    @objc private func handleAppDidBecomeActive() {
        print("[Unity] 📱 App did become active (loaded: \(loaded), frameworkInit: \(isFrameworkInitialized))")

        // Unity가 로드되지 않았으면 단순히 상태만 업데이트
        guard loaded && isFrameworkInitialized else {
            isAppActive = true
            print("[Unity] Unity not loaded, just updating isAppActive")
            return
        }

        // Foreground 복귀 시 안전하게 Unity 재개
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            // 다시 한번 상태 확인 (async 동안 변경될 수 있음)
            guard self.loaded && self.isFrameworkInitialized else {
                self.isAppActive = true
                return
            }

            // ✅ 기존 pending CATransaction 완료 대기
            CATransaction.flush()

            CATransaction.begin()
            CATransaction.setCompletionBlock {
                print("[Unity] ✅ CATransaction completed")
            }
            CATransaction.commit()

            // ✅ 핵심 수정: completionBlock 밖에서 즉시 실행
            // 빈 CATransaction의 completionBlock은 호출 타이밍이 보장되지 않으므로
            // resume()과 상태 업데이트는 즉시 실행해야 함
            self.resume()
            self.isAppActive = true
            print("[Unity] ✅ Unity resumed and isAppActive set to true")

            // 큐에 쌓인 메시지 처리
            self.queueLock.lock()
            let pendingMessages = self.messageQueue
            if self.isGameObjectReady {
                self.messageQueue.removeAll()
            }
            self.queueLock.unlock()

            if self.isGameObjectReady && !pendingMessages.isEmpty {
                print("[Unity] 📤 Processing \(pendingMessages.count) queued messages after foreground")
                for msg in pendingMessages {
                    self.sendMessageImmediate(msg.objectName, methodName: msg.methodName, parameter: msg.parameter)
                }
            }

            // Unity View 재연결 알림
            NotificationCenter.default.post(
                name: NSNotification.Name("UnityDidBecomeActive"),
                object: nil
            )
        }
    }

    // MARK: - App Termination

    /// 앱 종료 시 호출 - blocking 없이 빠르게 정리
    /// Watchdog 타임아웃 방지를 위해 동기 작업 최소화
    func prepareForTermination() {
        print("[Unity] 🛑 Preparing for termination...")

        // 1. 상태 플래그만 업데이트 (blocking 작업 없음)
        isAppActive = false
        isPaused = true

        // 2. 메시지 큐 정리
        queueLock.lock()
        messageQueue.removeAll()
        isGameObjectReady = false
        queueLock.unlock()

        // 3. 옵저버 제거 (재시작 시 중복 등록 방지)
        NotificationCenter.default.removeObserver(self)

        // ⚠️ 중요: unloadApplication() 호출하지 않음
        // - 이 작업이 main thread를 blocking하여 watchdog crash 유발
        // - iOS가 프로세스 종료 시 자동으로 메모리 해제함

        print("[Unity] ✅ Termination preparation completed")
    }

    // MARK: - Unity Control

    /// Unity 시작 (기존 동기 버전 - 하위 호환성 유지)
    func start() {
        start(completion: nil)
    }

    /// Unity 시작 (completion handler 버전 - Event-Driven 패턴)
    /// - Parameter completion: Metal context 준비 완료 시 호출 (nil이면 무시)
    func start(completion: ((Bool) -> Void)?) {
        // ✅ 기존 stale 상태 감지 및 정리
        if _framework != nil && !validateState() {
            print("[Unity] ⚠️ Stale state detected on start, forcing reset")
            forceReset()
        }

        guard !loaded else {
            print("[Unity] ⚠️ Already loaded")
            completion?(true)
            return
        }

        print("[Unity] Starting Unity...")

        // 여기서 framework를 처음 접근하면 loadFramework() 호출됨
        framework.runEmbedded(withArgc: CommandLine.argc, argv: CommandLine.unsafeArgv, appLaunchOpts: nil)
        framework.appController()?.window?.isHidden = true

        loaded = true
        isPaused = false

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleGameObjectReady),
            name: NSNotification.Name("UnityCharactorReady"),
            object: nil
        )

        print("[Unity] ✅ Framework started, checking Metal readiness...")

        // ✅ Metal 준비 확인 (Event-Driven)
        waitForMetalReady { [weak self] ready in
            guard let self = self else { return }

            if ready {
                print("[Unity] ✅ Metal context ready")
                NotificationCenter.default.post(
                    name: Unity.UnityMetalReadyNotification,
                    object: nil
                )
            } else {
                print("[Unity] ⚠️ Metal context not ready (timeout)")
            }

            completion?(ready)
        }
    }

    // MARK: - Metal Ready Detection

    /// Metal context 준비 상태 확인 (적응형 polling 방식, non-blocking)
    /// - Parameters:
    ///   - maxAttempts: 최대 시도 횟수 (기본값: 15회 ≈ 800ms)
    ///   - completion: 준비 완료 시 호출
    ///
    /// 폴링 전략 (성능 최적화):
    /// - 초기 5회: 20ms 간격 (빠른 감지)
    /// - 이후: 100ms 간격 (안정적 대기)
    /// - 총 최대 시간: 5×20ms + 10×100ms = 1.1초 (여유 확보)
    private func waitForMetalReady(maxAttempts: Int = 15, completion: @escaping (Bool) -> Void) {
        var attempts = 0

        func checkReady() {
            attempts += 1

            // Metal context 준비 확인: rootView와 layer 존재 여부
            if let rootView = _framework?.appController()?.rootView,
               rootView.layer.sublayers?.isEmpty == false {
                // CAMetalLayer 존재 확인
                if hasMetalLayer(in: rootView.layer) {
                    print("[Unity] ✅ Metal layer found after \(attempts) attempts")
                    DispatchQueue.main.async { completion(true) }
                    return
                }
            }

            if attempts >= maxAttempts {
                print("[Unity] ⚠️ Metal ready timeout after \(attempts) attempts")
                DispatchQueue.main.async { completion(false) }
                return
            }

            // 적응형 폴링 간격: 초기 5회는 20ms, 이후 100ms
            let delay: Double = attempts <= 5 ? 0.02 : 0.1
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                checkReady()
            }
        }

        checkReady()
    }

    /// CAMetalLayer 존재 여부 재귀 확인
    private func hasMetalLayer(in layer: CALayer) -> Bool {
        if layer is CAMetalLayer {
            return true
        }
        return layer.sublayers?.contains { hasMetalLayer(in: $0) } ?? false
    }

    /// Unity 일시정지
    func pause() {
        guard loaded && isFrameworkInitialized && !isPaused else { return }

        print("[Unity] ⏸️ Pausing Unity")
        isPaused = true
        _framework?.pause(true)
    }

    /// Unity 재개
    func resume() {
        guard loaded && isFrameworkInitialized && isPaused else { return }

        print("[Unity] ▶️ Resuming Unity")
        _framework?.pause(false)
        isPaused = false
    }

    func stop() {
        guard loaded && isFrameworkInitialized else { return }

        _framework?.unloadApplication()
        loaded = false
        isPaused = false

        queueLock.lock()
        isGameObjectReady = false
        messageQueue.removeAll()
        queueLock.unlock()

        // ✅ 모든 옵저버 한번에 제거 - 좀비 옵저버로 인한 메모리 오염 방지
        NotificationCenter.default.removeObserver(self)

        print("[Unity] ⏹️ Unity stopped")
    }

    // MARK: - State Validation

    /// Unity 싱글톤 상태 유효성 검사
    /// 앱 종료 후 재시작 시 stale 상태 감지
    func validateState() -> Bool {
        // Framework 참조가 있지만 실제로 유효하지 않은 경우 감지
        if _framework != nil {
            // rootView가 없으면 stale
            guard let controller = _framework?.appController(),
                  let rootView = controller.rootView else {
                print("[Unity] ⚠️ Stale: framework exists but no rootView")
                return false
            }

            // rootView가 window hierarchy에 없으면 stale (로드 완료 후에만 체크)
            if rootView.window == nil && loaded {
                print("[Unity] ⚠️ Stale: rootView not in window hierarchy")
                return false
            }
        }

        // 앱이 active인데 Unity가 paused면 불일치
        if isAppActive && isPaused && loaded {
            print("[Unity] ⚠️ State mismatch: app active but Unity paused")
            return false
        }

        return true
    }

    /// Stale 상태 강제 리셋
    /// 앱 재시작 시 이전 인스턴스의 잔여 상태를 정리
    func forceReset() {
        print("[Unity] 🔄 Force resetting stale Unity state")

        // 1. 모든 옵저버 제거
        NotificationCenter.default.removeObserver(self)

        // 2. CATransaction 정리 (pending 작업 완료 대기)
        // 메인 스레드에서만 CATransaction 조작 가능
        if Thread.isMainThread {
            CATransaction.flush()
        }

        // 3. 상태 초기화
        loaded = false
        isPaused = false
        isAppActive = true

        queueLock.lock()
        isGameObjectReady = false
        messageQueue.removeAll()
        queueLock.unlock()

        // 4. Framework 참조 해제 (다음 start()에서 재로드)
        // ⚠️ unloadApplication()은 호출하지 않음 (이미 invalid 상태일 수 있음)
        _framework = nil

        // 5. 앱 라이프사이클 옵저버 재등록
        setupAppLifecycleObservers()

        print("[Unity] ✅ Force reset completed")
    }

    deinit {
        // ✅ deinit 시에도 모든 옵저버 정리
        NotificationCenter.default.removeObserver(self)
        print("[Unity] 🗑️ Unity singleton deallocated")
    }

    var view: UIView? {
        // Framework가 초기화되지 않았거나 로드되지 않았으면 nil 반환
        guard loaded && isFrameworkInitialized else {
            return nil
        }
        guard isAppActive else {
            print("[Unity] ⚠️ App not active, returning nil view")
            return nil
        }
        return _framework?.appController()?.rootView
    }

    @objc
    private func handleGameObjectReady() {
        queueLock.lock()
        let count = messageQueue.count
        isGameObjectReady = true
        let messagesToProcess = messageQueue
        messageQueue.removeAll()
        queueLock.unlock()

        print("[Unity] 🎉 GameObject Ready! Processing \(count) queued messages...")

        for msg in messagesToProcess {
            sendMessageImmediate(msg.objectName, methodName: msg.methodName, parameter: msg.parameter)
        }
    }

    func sendMessage(_ objectName: String, methodName: String, parameter: String) {
        print("[Unity] sendMessage: \(objectName).\(methodName)(\(parameter))")

        // Unity가 로드되지 않았으면 무시
        guard loaded && isFrameworkInitialized else {
            print("[Unity] ❌ Not loaded, ignoring message")
            return
        }

        // Background 상태에서는 메시지 큐잉
        if !isAppActive {
            print("[Unity] ⏳ App not active, queuing message")
            enqueueMessage(objectName, methodName: methodName, parameter: parameter)
            return
        }

        queueLock.lock()
        let ready = isGameObjectReady
        if !ready {
            // 큐잉 전 중복 제거 및 크기 제한 적용
            queueLock.unlock()
            enqueueMessage(objectName, methodName: methodName, parameter: parameter)
            print("[Unity] ⏳ Queuing message (GameObject not ready)")
            return
        }
        queueLock.unlock()

        sendMessageImmediate(objectName, methodName: methodName, parameter: parameter)
    }

    /// 메시지를 큐에 추가 (중복 제거 + 크기 제한)
    /// - 동일한 objectName + methodName 조합의 이전 메시지는 제거 (최신 값만 유지)
    /// - 큐 크기가 maxQueueSize를 초과하면 가장 오래된 메시지 제거
    private func enqueueMessage(_ objectName: String, methodName: String, parameter: String) {
        queueLock.lock()
        defer { queueLock.unlock() }

        // 동일 메시지 중복 제거 (objectName + methodName 기준)
        messageQueue.removeAll { $0.objectName == objectName && $0.methodName == methodName }

        // 큐 크기 제한 (FIFO - 가장 오래된 메시지 제거)
        if messageQueue.count >= maxQueueSize {
            let removed = messageQueue.removeFirst()
            print("[Unity] ⚠️ Queue full, dropping oldest: \(removed.objectName).\(removed.methodName)")
        }

        messageQueue.append((objectName, methodName, parameter))
    }

    private func sendMessageImmediate(_ objectName: String, methodName: String, parameter: String) {
        // 메인 스레드에서만 Unity 메시지 전송
        if !Thread.isMainThread {
            DispatchQueue.main.async { [weak self] in
                self?.sendMessageImmediate(objectName, methodName: methodName, parameter: parameter)
            }
            return
        }

        guard loaded && isFrameworkInitialized && isAppActive else {
            print("[Unity] ⚠️ Cannot send message - loaded: \(loaded), frameworkInit: \(isFrameworkInitialized), active: \(isAppActive)")
            return
        }

        print("[Unity] ✅ Sending to GameObject: \(objectName).\(methodName)(\(parameter))")
        _framework?.sendMessageToGO(withName: objectName, functionName: methodName, message: parameter)
    }
}

// MARK: Extensions

extension URL {
    func loadTexture() -> MTLTexture? {
        let device = MTLCreateSystemDefaultDevice()!
        let loader = MTKTextureLoader(device: device)
        return try? loader.newTexture(URL: self)
    }
}
