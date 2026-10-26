import Foundation
import React
import WatchConnectivity

// Initialized before React: WatchConnectivity can deliver while JS is suspended.
final class PhoneWatchInbox: NSObject, WCSessionDelegate {
  static let shared = PhoneWatchInbox()
  private let queue = DispatchQueue(label: "com.runtaeho.watchInbox")
  private let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("WatchInbox")
  var onPending: (() -> Void)?
  private override init() {
    super.init()
    do { try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true) }
    catch { NSLog("[WatchSync] Cannot initialize inbox") }
  }
  func activate() {
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }
  private func key(_ record: [String: Any]) throws -> String {
    guard let id = record["sessionId"] as? String, UUID(uuidString: id) != nil,
          record["source"] as? String == "APPLE_WATCH", let owner = record["ownerUserId"] as? NSNumber, owner.int64Value > 0 else {
      throw NSError(domain: "WatchSync", code: 1)
    }
    return "\(owner)-\(id.lowercased())"
  }
  func records() throws -> [[String: Any]] {
    try queue.sync {
      try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
        .filter { $0.pathExtension == "json" }.map { url in
          guard let value = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any] else { throw NSError(domain: "WatchSync", code: 2) }
          return value
        }
    }
  }
  func acknowledge(_ id: String, source: String, owner: String, serverId: String) throws {
    try queue.sync {
      let record: [String: Any] = ["sessionId": id, "source": source, "ownerUserId": NSNumber(value: Int64(owner) ?? 0)]
      let name = try key(record)
      guard let server = Int64(serverId), server > 0 else { throw NSError(domain: "WatchSync", code: 3) }
      let acknowledgement: [String: Any] = ["sessionId": id, "source": source, "ownerUserId": owner, "runningRecordId": serverId]
      // Persist acknowledgement before removing input. A lost delivery is retried on activation.
      try JSONSerialization.data(withJSONObject: acknowledgement).write(to: directory.appendingPathComponent(name + ".ack"), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
      let input = directory.appendingPathComponent(name + ".json")
      if FileManager.default.fileExists(atPath: input.path) { try FileManager.default.removeItem(at: input) }
      WCSession.default.transferUserInfo(acknowledgement)
    }
  }
  func setOwner(_ owner: String?) throws {
    guard WCSession.isSupported() else { return }
    let context = ["ownerUserId": owner ?? ""]
    UserDefaults.standard.set(context, forKey: "watchOwnerContext")
    if WCSession.default.activationState == .activated { try WCSession.default.updateApplicationContext(context) }
  }
  func session(_ session: WCSession, didReceive file: WCSessionFile) {
    do {
      try queue.sync {
        let data = try Data(contentsOf: file.fileURL)
        guard data.count <= 40_000_000, let record = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw NSError(domain: "WatchSync", code: 4) }
        let name = try key(record)
        let ack = directory.appendingPathComponent(name + ".ack")
        if FileManager.default.fileExists(atPath: ack.path), let value = try JSONSerialization.jsonObject(with: Data(contentsOf: ack)) as? [String: Any] {
          session.transferUserInfo(value)
        } else {
          let destination = directory.appendingPathComponent(name + ".json")
          if !FileManager.default.fileExists(atPath: destination.path) { try data.write(to: destination, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]) }
        }
      }
      DispatchQueue.main.async { self.onPending?() }
    } catch { NSLog("[WatchSync] Incoming record retained on watch; receipt failed") }
  }
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if error != nil { NSLog("[WatchSync] Activation deferred"); return }
    if let context = UserDefaults.standard.dictionary(forKey: "watchOwnerContext") { do { try session.updateApplicationContext(context) } catch { NSLog("[WatchSync] Owner context deferred") } }
    queue.async {
      do {
        for url in try FileManager.default.contentsOfDirectory(at: self.directory, includingPropertiesForKeys: nil) where url.pathExtension == "ack" {
          if let ack = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any] { session.transferUserInfo(ack) }
        }
      } catch { NSLog("[WatchSync] Acknowledgement retry deferred") }
    }
  }
  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) { session.activate() }
}

@objc(RNWatchSyncBridge)
final class RNWatchSyncBridge: RCTEventEmitter {
  override static func requiresMainQueueSetup() -> Bool { true }
  override func supportedEvents() -> [String]! { ["watchSyncPendingRecords"] }
  override func startObserving() { PhoneWatchInbox.shared.onPending = { [weak self] in self?.sendEvent(withName: "watchSyncPendingRecords", body: nil) } }
  override func stopObserving() { PhoneWatchInbox.shared.onPending = nil }
  @objc(setOwnerUserId:resolver:rejecter:)
  func setOwnerUserId(_ owner: String?, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    do { try PhoneWatchInbox.shared.setOwner(owner); resolve(nil) } catch { reject("watch_owner_failed", "Watch linkage deferred", nil) }
  }
  @objc(getPendingRecords:rejecter:)
  func getPendingRecords(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    do { resolve(try PhoneWatchInbox.shared.records()) } catch { reject("watch_inbox_failed", "Watch inbox unavailable", nil) }
  }
  @objc(acknowledgeRecord:source:ownerUserId:runningRecordId:resolver:rejecter:)
  func acknowledgeRecord(_ id: String, source: String, ownerUserId: String, runningRecordId: String, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    do { try PhoneWatchInbox.shared.acknowledge(id, source: source, owner: ownerUserId, serverId: runningRecordId); resolve(nil) } catch { reject("watch_ack_failed", "Watch acknowledgement deferred", nil) }
  }
}
