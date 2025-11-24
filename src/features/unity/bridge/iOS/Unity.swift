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

    private var loaded = false
    private let framework: UnityFramework

    private let queueLock = NSLock()
    private var messageQueue: [(objectName: String, methodName: String, parameter: String)] = []
    private var isGameObjectReady = false

    private init() {
        // Load framework and get the singleton instance
        let bundlePath = Bundle.main.bundlePath + self.frameworkPath
        let bundle = Bundle(path: bundlePath)

        if bundle?.isLoaded == false {
            bundle?.load()
        }

        framework = bundle?.principalClass?.getInstance() as! UnityFramework

        let executeHeader = #dsohandle.assumingMemoryBound(to: MachHeader.self)
        framework.setExecuteHeader(executeHeader)

        framework.setDataBundleId("com.unity3d.framework")
    }

    func start() {
        let loadingGroup = DispatchGroup()
        loadingGroup.wait()

        framework.runEmbedded(withArgc: CommandLine.argc, argv: CommandLine.unsafeArgv, appLaunchOpts: nil)
        framework.appController().window.isHidden = true

        loaded = true

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleGameObjectReady),
            name: NSNotification.Name("UnityCharactorReady"),
            object: nil
        )

        print("[Unity] Framework started, waiting for GameObject ready signal...")
    }

    func stop() {
        framework.unloadApplication()
        loaded = false

        queueLock.lock()
        isGameObjectReady = false
        messageQueue.removeAll()
        queueLock.unlock()

        NotificationCenter.default.removeObserver(self)
    }

    var view: UIView? { loaded ? framework.appController().rootView : nil }

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

        if !loaded {
            print("[Unity] ❌ Not loaded, ignoring")
            return
        }

        queueLock.lock()
        let ready = isGameObjectReady
        queueLock.unlock()

        if !ready {
            print("[Unity] ⏳ Queuing message (GameObject not ready)")
            queueLock.lock()
            messageQueue.append((objectName, methodName, parameter))
            queueLock.unlock()
            return
        }

        sendMessageImmediate(objectName, methodName: methodName, parameter: parameter)
    }

    private func sendMessageImmediate(_ objectName: String, methodName: String, parameter: String) {
        print("[Unity] ✅ Sending to GameObject: \(objectName).\(methodName)(\(parameter))")
        framework.sendMessageToGO(withName: objectName, functionName: methodName, message: parameter)
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
