import ActivityKit
import Foundation
import React

@objc(RunningLiveStatus)
class RunningLiveStatus: RCTEventEmitter {
  private var commandObserver: NSObjectProtocol?

  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return ["runningLiveStatusCommand"]
  }

  override func startObserving() {
    commandObserver = NotificationCenter.default.addObserver(
      forName: runningLiveStatusCommandNotification,
      object: nil,
      queue: .main
    ) { [weak self] notification in
      self?.sendEvent(withName: "runningLiveStatusCommand", body: notification.userInfo)
    }
  }

  override func stopObserving() {
    if let commandObserver {
      NotificationCenter.default.removeObserver(commandObserver)
    }
    commandObserver = nil
  }

  @objc
  func startLiveStatus(
    _ snapshot: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 17.0, *), ActivityAuthorizationInfo().areActivitiesEnabled else {
      resolve(false)
      return
    }

    guard let contentState = contentState(from: snapshot),
          let recordId = number(snapshot["recordId"])?.intValue else {
      resolve(false)
      return
    }

    Task {
      do {
        for activity in Activity<RunningLiveStatusAttributes>.activities
          where activity.attributes.recordId == recordId {
          await activity.end(nil, dismissalPolicy: .immediate)
        }

        let content = ActivityContent(state: contentState, staleDate: nil)
        _ = try Activity.request(
          attributes: RunningLiveStatusAttributes(recordId: recordId),
          content: content,
          pushType: nil
        )
        resolve(true)
      } catch {
        reject("running_live_status_start_failed", error.localizedDescription, error)
      }
    }
  }

  @objc
  func updateLiveStatus(
    _ snapshot: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 17.0, *) else {
      resolve(false)
      return
    }

    guard let contentState = contentState(from: snapshot),
          let recordId = number(snapshot["recordId"])?.intValue else {
      resolve(false)
      return
    }

    Task {
      for activity in Activity<RunningLiveStatusAttributes>.activities
        where activity.attributes.recordId == recordId {
        await activity.update(ActivityContent(state: contentState, staleDate: nil))
      }
      resolve(true)
    }
  }

  @objc
  func endLiveStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 17.0, *) else {
      resolve(false)
      return
    }

    Task {
      for activity in Activity<RunningLiveStatusAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
      resolve(true)
    }
  }

  @objc
  func getPendingCommand(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let command = UserDefaults.standard.dictionary(forKey: runningLiveStatusPendingCommandKey) else {
      resolve(nil)
      return
    }
    resolve(command)
  }

  @objc
  func clearPendingCommand(
    _ commandId: NSString,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let defaults = UserDefaults.standard
    let storedId = defaults.dictionary(forKey: runningLiveStatusPendingCommandKey)?["id"] as? String
    if storedId == nil || storedId == commandId as String {
      defaults.removeObject(forKey: runningLiveStatusPendingCommandKey)
    }
    resolve(true)
  }

  private func contentState(from snapshot: NSDictionary) -> RunningLiveStatusAttributes.ContentState? {
    guard let state = snapshot["state"] as? String,
          let distanceMeters = number(snapshot["distanceMeters"])?.intValue,
          let elapsedSec = number(snapshot["elapsedSec"])?.intValue,
          let updatedAtMs = number(snapshot["updatedAtMs"])?.intValue else {
      return nil
    }

    return RunningLiveStatusAttributes.ContentState(
      state: state,
      distanceMeters: distanceMeters,
      elapsedSec: elapsedSec,
      paceSecPerKm: number(snapshot["paceSecPerKm"])?.intValue,
      updatedAtMs: updatedAtMs
    )
  }

  private func number(_ value: Any?) -> NSNumber? {
    if value is NSNull {
      return nil
    }
    return value as? NSNumber
  }
}
