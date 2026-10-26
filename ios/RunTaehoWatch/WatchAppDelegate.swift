import WatchKit
import WatchConnectivity

final class WatchAppDelegate: NSObject, WKExtensionDelegate {
  func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
    for task in backgroundTasks {
      if let connectivity = task as? WKWatchConnectivityRefreshBackgroundTask {
        completeWhenDelivered(connectivity, attempts: 25)
      } else {
        task.setTaskCompletedWithSnapshot(false)
      }
    }
  }
  private func completeWhenDelivered(_ task: WKWatchConnectivityRefreshBackgroundTask, attempts: Int) {
    // Give the session delegate time to persist incoming acknowledgements.
    // If the OS time budget expires, the watch's finalized file still survives.
    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
      if attempts <= 0 || (WCSession.default.activationState == .activated && !WCSession.default.hasContentPending) {
        task.setTaskCompletedWithSnapshot(false)
      } else {
        self.completeWhenDelivered(task, attempts: attempts - 1)
      }
    }
  }
}
