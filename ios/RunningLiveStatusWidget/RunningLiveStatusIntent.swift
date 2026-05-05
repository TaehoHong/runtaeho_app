import AppIntents
import Foundation

private let runningLiveStatusSuiteName = "group.com.runtaeho.runtaeho"
private let runningLiveStatusPendingCommandKey = "running_live_status_pending_command"

private func storeRunningLiveStatusCommand(_ action: String) {
  let command: [String: Any] = [
    "id": UUID().uuidString,
    "action": action,
    "createdAtMs": Int(Date().timeIntervalSince1970 * 1000),
  ]
  UserDefaults(suiteName: runningLiveStatusSuiteName)?
    .set(command, forKey: runningLiveStatusPendingCommandKey)
}

@available(iOS 17.0, *)
struct PauseRunningIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "일시정지"
  static var openAppWhenRun: Bool = false

  func perform() async throws -> some IntentResult {
    storeRunningLiveStatusCommand("pause")
    return .result()
  }
}

@available(iOS 17.0, *)
struct ResumeRunningIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "재개"
  static var openAppWhenRun: Bool = false

  func perform() async throws -> some IntentResult {
    storeRunningLiveStatusCommand("resume")
    return .result()
  }
}

@available(iOS 17.0, *)
struct StopRunningIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "종료"
  static var openAppWhenRun: Bool = true

  func perform() async throws -> some IntentResult {
    storeRunningLiveStatusCommand("stop")
    return .result()
  }
}
