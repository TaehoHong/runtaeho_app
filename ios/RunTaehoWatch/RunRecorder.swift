import Foundation
import HealthKit
import CoreLocation
import WatchConnectivity

final class RunRecorder: NSObject, ObservableObject, HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate, CLLocationManagerDelegate, WCSessionDelegate {
  @Published var record: RunCheckpoint?
  @Published var owner: Int64?
  @Published var errorMessage: String?
  @Published var finishing = false
  @Published var lastServerSaved = false
  private var starting = false
  private let health = HKHealthStore()
  private let location = CLLocationManager()
  private var workout: HKWorkoutSession?
  private var builder: HKLiveWorkoutBuilder?
  private var route: HKWorkoutRouteBuilder?
  private var timer: Timer?
  private let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Runs")
  private var checkpoint: URL { directory.appendingPathComponent("active.json") }
  override init() {
    super.init()
    location.delegate = self
    location.activityType = .fitness
    location.desiredAccuracy = kCLLocationAccuracyBest
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      if try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil).contains(where: { $0.pathExtension == "unmeasured" }) {
        errorMessage = "거리 측정이 없는 기록은 기기에 보관되어 있습니다. 서버에 전송되지 않습니다."
      }
      if try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil).contains(where: { $0.pathExtension == "invalidtimeline" }) {
        errorMessage = "시계 변경으로 확인이 필요한 기록은 기기에 보관되어 있습니다. 서버에 전송되지 않습니다."
      }
      if FileManager.default.fileExists(atPath: checkpoint.path) {
        var saved = try JSONDecoder().decode(RunCheckpoint.self, from: Data(contentsOf: checkpoint))
        // Recovery resumes from the last durable checkpoint, paused. Never count
        // process downtime or claim continuous GPS across a restart.
        saved.activeSince = nil
        record = saved
        errorMessage = "기록이 복구되었습니다. 종료하여 저장하세요."
      }
    } catch { errorMessage = "저장된 기록을 읽지 못했습니다." }
    owner = UserDefaults.standard.object(forKey: "ownerUserId") as? Int64
    if WCSession.isSupported() { WCSession.default.delegate = self; WCSession.default.activate() }
    timer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
      guard let self else { return }
      if self.record != nil { self.persist() }
      self.transferPending()
    }
  }
  @discardableResult private func persist() -> Bool {
    guard var value = record else { return false }
    let now = Date()
    if value.activeSince != nil { value.pause(at: now); value.activeSince = now }
    do { try JSONEncoder().encode(value).write(to: checkpoint, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]); record = value; return true }
    catch { errorMessage = "기록 저장 실패. 저장 공간을 확인하세요."; return false }
  }
  func start() {
    guard record == nil, !starting, let owner, owner > 0 else { return }
    starting = true
    errorMessage = nil
    lastServerSaved = false
    let types: Set<HKSampleType> = [HKObjectType.workoutType(), HKSeriesType.workoutRoute(), HKQuantityType(.distanceWalkingRunning), HKQuantityType(.activeEnergyBurned)]
    health.requestAuthorization(toShare: types, read: [HKQuantityType(.heartRate), HKQuantityType(.distanceWalkingRunning), HKQuantityType(.activeEnergyBurned)]) { [weak self] success, error in
      DispatchQueue.main.async {
        guard let self else { return }
        self.starting = false
        guard success, error == nil else { self.errorMessage = "건강 권한을 확인하세요."; return }
        do {
          let configuration = HKWorkoutConfiguration(); configuration.activityType = .running; configuration.locationType = .outdoor
          let workout = try HKWorkoutSession(healthStore: self.health, configuration: configuration)
          let builder = workout.associatedWorkoutBuilder()
          builder.dataSource = HKLiveWorkoutDataSource(healthStore: self.health, workoutConfiguration: configuration)
          workout.delegate = self; builder.delegate = self
          self.workout = workout; self.builder = builder
          self.route = HKWorkoutRouteBuilder(healthStore: self.health, device: .local())
          let now = Date()
          self.record = RunCheckpoint(ownerUserId: owner, startTimestamp: Int(now.timeIntervalSince1970), activeSince: now)
          guard self.persist() else { self.record = nil; return }
          workout.startActivity(with: now)
          builder.beginCollection(withStart: now) { success, _ in if !success { DispatchQueue.main.async { self.errorMessage = "운동 측정 시작 실패" } } }
          self.location.requestWhenInUseAuthorization(); self.location.startUpdatingLocation()
        } catch { self.errorMessage = "운동 측정을 시작하지 못했습니다." }
      }
    }
  }
  var hasLiveSession: Bool { workout != nil }
  func togglePause() {
    guard workout != nil, !finishing else { return }
    if record?.activeSince != nil { workout?.pause() }
    else { workout?.resume() }
  }
  func finish() {
    guard !finishing, record != nil else { return }
    finishing = true
    let endedAt = Date()
    record?.pause(at: endedAt); record?.endTimestamp = Int(endedAt.timeIntervalSince1970)
    guard persist() else { finishing = false; return }
    location.stopUpdatingLocation()
    let completedBuilder = builder
    let completedRoute = route
    workout?.end()
    guard let completedBuilder else { finalizeRecord(); return }
    completedBuilder.endCollection(withEnd: endedAt) { success, _ in
      DispatchQueue.main.async {
        guard success else { self.finishing = false; self.errorMessage = "운동 종료 실패. 다시 종료하세요."; return }
        self.updateMetrics(completedBuilder)
        self.record?.activeSeconds = completedBuilder.elapsedTime(at: endedAt)
        self.record?.durationSec = max(0, Int(completedBuilder.elapsedTime(at: endedAt)))
        guard let id = self.record?.sessionId, self.finalizeRecord() else { return }
        completedBuilder.addMetadata(["com.runtaeho.watchSessionId": id]) { success, _ in
          guard success else { DispatchQueue.main.async { self.errorMessage = "건강 기록 저장 실패. 러닝 기록은 동기화 대기 중입니다." }; return }
          completedBuilder.finishWorkout { saved, error in
            guard let saved, error == nil else { DispatchQueue.main.async { self.errorMessage = "건강 기록 저장 실패" }; return }
            completedRoute?.finishRoute(with: saved, metadata: ["com.runtaeho.watchSessionId": id]) { _, error in if error != nil { NSLog("[WatchSync] Health route save failed") } }
          }
        }
      }
    }
  }
  @discardableResult private func finalizeRecord() -> Bool {
    guard let value = record else { finishing = false; return false }
    do {
      if value.distanceMeasured == true && value.hasValidCompletedTimeline {
        try value.completedData().write(to: directory.appendingPathComponent(value.sessionId + ".json"), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
      } else {
        // Preserve the original checkpoint privately; a missing sensor result is
        // not a measured zero and must never enter the upload queue.
        let reason = value.distanceMeasured == true ? "invalidtimeline" : "unmeasured"
        try JSONEncoder().encode(value).write(to: directory.appendingPathComponent(value.sessionId + "." + reason), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        errorMessage = reason == "unmeasured"
          ? "거리를 측정하지 못했습니다. 기록은 기기에 보관되며 서버에 전송되지 않습니다."
          : "시계 변경으로 기록 시간을 확인해야 합니다. 기록은 기기에 보관되며 서버에 전송되지 않습니다."
      }
      try FileManager.default.removeItem(at: checkpoint)
      record = nil; workout = nil; builder = nil; route = nil; finishing = false; lastServerSaved = false
      transferPending()
      return true
    } catch { finishing = false; errorMessage = "기록 저장 실패. 다시 종료하세요."; return false }
  }
  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard record?.activeSince != nil else { return }
    let valid = locations.filter { $0.horizontalAccuracy >= 0 && $0.horizontalAccuracy <= 50 && abs($0.timestamp.timeIntervalSinceNow) < 30 }
    var accepted: [CLLocation] = []
    for point in valid {
      let sample = RunCheckpoint.Point(latitude: point.coordinate.latitude, longitude: point.coordinate.longitude, timestampMs: Int64(point.timestamp.timeIntervalSince1970 * 1000), speed: point.speed.isFinite ? max(0, point.speed) : 0, altitude: point.altitude, accuracy: point.horizontalAccuracy)
      guard record?.accepts(sample, nowMs: Int64(Date().timeIntervalSince1970 * 1000)) == true else { continue }
      guard (record?.gpsPoints.count ?? 0) < 100_000 else { errorMessage = "GPS 저장 한도에 도달했습니다. 기록을 종료하세요."; togglePause(); return }
      record?.gpsPoints.append(sample)
      accepted.append(point)
    }
    route?.insertRouteData(accepted) { success, _ in if !success { NSLog("[WatchSync] Health route append failed") } }
    persist()
  }
  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) { errorMessage = "GPS 수신을 확인하세요." }
  func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
    DispatchQueue.main.async {
      guard self.record != nil, self.workout === workoutSession else { return }
      if toState == .paused || toState == .ended {
        self.record?.pause(at: date)
        if let builder = self.builder { self.record?.activeSeconds = builder.elapsedTime(at: date); self.record?.durationSec = max(0, Int(builder.elapsedTime(at: date))) }
        self.location.stopUpdatingLocation()
      }
      if toState == .running && !self.finishing { if self.record?.activeSince == nil { self.record?.activeSince = date }; self.location.startUpdatingLocation() }
      self.persist()
    }
  }
  func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) { DispatchQueue.main.async { guard self.workout === workoutSession else { return }; self.record?.pause(at: Date()); self.location.stopUpdatingLocation(); self.persist(); self.errorMessage = "운동 측정이 중단되었습니다. 기록을 종료하세요." } }
  func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
  func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
    DispatchQueue.main.async {
      guard self.record != nil, self.builder === workoutBuilder else { return }
      self.updateMetrics(workoutBuilder)
      self.persist()
    }
  }
  private func updateMetrics(_ builder: HKLiveWorkoutBuilder) {
    if let stat = builder.statistics(for: HKQuantityType(.heartRate)) { record?.heartRate = min(255, max(0, Int(stat.averageQuantity()?.doubleValue(for: .count().unitDivided(by: .minute())) ?? 0))) }
    if let stat = builder.statistics(for: HKQuantityType(.activeEnergyBurned)) { record?.calorie = max(0, Int(stat.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0)) }
    if let quantity = builder.statistics(for: HKQuantityType(.distanceWalkingRunning))?.sumQuantity() {
      let meters = quantity.doubleValue(for: .meter())
      if meters.isFinite && meters >= 0 {
        record?.distance = Int(meters.rounded())
        record?.distanceMeasured = true
      }
    }
  }
  private func transferPending() {
    let session = WCSession.default
    guard session.activationState == .activated else { return }
    do {
      let inFlight = Set(session.outstandingFileTransfers.map { $0.file.fileURL.lastPathComponent })
      for url in try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) where url.lastPathComponent != "active.json" && url.pathExtension == "json" && !inFlight.contains(url.lastPathComponent) {
        session.transferFile(url, metadata: nil)
      }
    } catch { errorMessage = "전송 대기 기록을 읽지 못했습니다." }
  }
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    DispatchQueue.main.async {
      if error != nil { self.errorMessage = "휴대폰 연결 대기 중" }
      self.updateOwner(session.receivedApplicationContext); self.transferPending()
    }
  }
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) { DispatchQueue.main.async { self.updateOwner(applicationContext) } }
  private func updateOwner(_ context: [String: Any]) {
    guard let value = context["ownerUserId"] as? String else { return }
    owner = Int64(value).flatMap { $0 > 0 ? $0 : nil }
    UserDefaults.standard.set(owner, forKey: "ownerUserId")
  }
  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    DispatchQueue.main.async {
      guard let id = userInfo["sessionId"] as? String, UUID(uuidString: id) != nil,
        userInfo["source"] as? String == "APPLE_WATCH", let owner = userInfo["ownerUserId"] as? String,
        let server = userInfo["runningRecordId"] as? String, (Int64(server) ?? 0) > 0 else { return }
      let url = self.directory.appendingPathComponent(id.lowercased() + ".json")
      do {
        if !FileManager.default.fileExists(atPath: url.path) { return }
        guard let saved = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any],
          (saved["ownerUserId"] as? NSNumber)?.stringValue == owner, saved["sessionId"] as? String == id else { return }
        try FileManager.default.removeItem(at: url)
        self.lastServerSaved = try !FileManager.default.contentsOfDirectory(at: self.directory, includingPropertiesForKeys: nil).contains { $0.pathExtension == "json" && $0.lastPathComponent != "active.json" }
      } catch { self.errorMessage = "동기화 확인 저장 실패" }
    }
  }
}
