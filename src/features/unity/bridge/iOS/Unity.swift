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
        // RunLoop의 다음 사이클에서 실행하여 CATransaction 충돌 방지
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
            CATransaction.setCompletionBlock { [weak self] in
                guard let self = self else { return }
                print("[Unity] ✅ CATransaction completed, now resuming")

                // ✅ CATransaction 완료 후에만 Unity resume
                self.resume()
                self.isAppActive = true

                // Unity View 재연결 알림
                NotificationCenter.default.post(
                    name: NSNotification.Name("UnityDidBecomeActive"),
                    object: nil
                )
            }
            CATransaction.commit()
        }
    }

    // MARK: - Unity Control

    func start() {
        guard !loaded else {
            print("[Unity] ⚠️ Already loaded, skipping start")
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

        print("[Unity] ✅ Framework started, waiting for GameObject ready signal...")
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
    /// 앱 업데이트 후 stale 상태 감지
    func validateState() -> Bool {
        // Framework가 로드되었지만 view가 없으면 stale 상태
        if loaded && _framework?.appController()?.rootView == nil {
            print("[Unity] ⚠️ Stale state detected: loaded but no view")
            return false
        }

        // 앱이 active인데 Unity가 paused면 불일치
        if isAppActive && isPaused && loaded {
            print("[Unity] ⚠️ State mismatch: app active but Unity paused")
            return false
        }

        return true
    }

    /// Stale 상태 강제 리셋
    func forceReset() {
        print("[Unity] 🔄 Force resetting stale Unity state")

        // 1. 모든 옵저버 제거
        NotificationCenter.default.removeObserver(self)

        // 2. 상태 초기화
        loaded = false
        isPaused = false
        isAppActive = true

        queueLock.lock()
        isGameObjectReady = false
        messageQueue.removeAll()
        queueLock.unlock()

        // 3. Framework 참조 해제 (다음 start()에서 재로드)
        _framework = nil

        // 4. 앱 라이프사이클 옵저버 재등록
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
            queueLock.lock()
            messageQueue.append((objectName, methodName, parameter))
            queueLock.unlock()
            return
        }

        queueLock.lock()
        let ready = isGameObjectReady
        if !ready {
            messageQueue.append((objectName, methodName, parameter))
            queueLock.unlock()
            print("[Unity] ⏳ Queuing message (GameObject not ready)")
            return
        }
        queueLock.unlock()

        sendMessageImmediate(objectName, methodName: methodName, parameter: parameter)
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
