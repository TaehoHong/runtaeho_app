import Foundation

struct RunCheckpoint: Codable {
  var schemaVersion = 1
  var sessionId = UUID().uuidString.lowercased()
  var ownerUserId: Int64
  var source = "APPLE_WATCH"
  var startTimestamp: Int
  var endTimestamp = 0
  var distance = 0
  var distanceMeasured: Bool? = nil
  var durationSec = 0
  var cadence = 0
  var heartRate = 0
  var calorie = 0
  var gpsPoints: [Point] = []
  var items: [Segment]?
  var segmentDistance: Int?
  var segmentDuration: Int?
  var segmentSamples: [SensorSample]?
  var lastHeartSampleTime: Int64?
  var lastCadenceSampleTime: Int64?
  var activeSince: Date?
  var activeSeconds: Double = 0
  struct Point: Codable {
    var latitude: Double; var longitude: Double; var timestampMs: Int64
    var speed: Double; var altitude: Double; var accuracy: Double?
  }
  struct Segment: Codable {
    var distance: Int; var durationSec: Int; var cadence: Int; var heartRate: Int
    var minHeartRate = 0; var maxHeartRate = 0; var orderIndex: Int
    var startTimestamp: Int; var endTimestamp: Int
    var gpsPoints: [Point] = []
  }
  struct SensorSample: Codable {
    var timestampMs: Int64; var heartRate: Double?; var cadence: Double?
  }
  mutating func addSensor(heartRate: Double? = nil, cadence: Double? = nil, at date: Date) {
    guard items != nil, activeSince != nil else { return }
    let time = Int64(date.timeIntervalSince1970 * 1000)
    var heart: Double?, steps: Double?
    if let value = heartRate, value.isFinite, value > 0, value <= 255, time > (lastHeartSampleTime ?? 0) {
      heart = value; lastHeartSampleTime = time
    }
    if let value = cadence, value.isFinite, value >= 0, value <= 255, time > (lastCadenceSampleTime ?? 0) {
      steps = value; lastCadenceSampleTime = time
    }
    if heart != nil || steps != nil { segmentSamples = (segmentSamples ?? []) + [SensorSample(timestampMs: time, heartRate: heart, cadence: steps)] }
  }
  mutating func captureSegment(at date: Date, force: Bool = false) {
    guard distanceMeasured == true, var segments = items else { return }
    let duration = elapsed(at: date), seconds = duration - (segmentDuration ?? 0)
    let meters = distance - (segmentDistance ?? 0), end = Int(date.timeIntervalSince1970)
    guard meters >= 0, seconds >= 0, force || seconds >= 10 else { return }
    if seconds == 0 {
      if !segments.isEmpty { segments[segments.count - 1].distance += meters; segments[segments.count - 1].endTimestamp = end }
    } else {
      let samples = segmentSamples ?? []
      func average(_ read: (SensorSample) -> Double?) -> Int {
        let values = samples.compactMap(read)
        return values.isEmpty ? 0 : Int((values.reduce(0, +) / Double(values.count)).rounded())
      }
      segments.append(Segment(distance: meters, durationSec: seconds, cadence: average { $0.cadence },
        heartRate: average { $0.heartRate }, orderIndex: segments.count,
        startTimestamp: segments.last?.endTimestamp ?? startTimestamp, endTimestamp: end))
    }
    items = segments; segmentDistance = distance; segmentDuration = duration; segmentSamples = []
  }
  func accepts(_ point: Point, nowMs: Int64) -> Bool {
    point.latitude.isFinite && point.longitude.isFinite && point.altitude.isFinite && point.speed.isFinite &&
      (-90...90).contains(point.latitude) && (-180...180).contains(point.longitude) &&
      point.timestampMs >= Int64(startTimestamp) * 1000 && point.timestampMs <= nowMs &&
      point.timestampMs > (gpsPoints.last?.timestampMs ?? 0) &&
      (point.accuracy.map { $0.isFinite && $0 >= 0 && $0 <= 50 } ?? true)
  }
  var hasValidCompletedTimeline: Bool {
    guard endTimestamp >= startTimestamp, durationSec >= 0, durationSec <= endTimestamp - startTimestamp else { return false }
    if let items, !items.isEmpty {
      guard items.count <= 10000, items.reduce(0, { $0 + $1.distance }) == distance,
        items.reduce(0, { $0 + $1.durationSec }) == durationSec else { return false }
      var previousEnd = startTimestamp
      for (index, item) in items.enumerated() {
        guard item.orderIndex == index, item.startTimestamp >= previousEnd, item.endTimestamp <= endTimestamp,
          item.durationSec >= 0, item.durationSec <= item.endTimestamp - item.startTimestamp,
          item.distance >= 0, item.distance == 0 || item.durationSec > 0 else { return false }
        previousEnd = item.endTimestamp
      }
    }
    var previous: Int64 = -1
    for point in gpsPoints {
      guard point.timestampMs >= Int64(startTimestamp) * 1000,
        point.timestampMs <= Int64(endTimestamp) * 1000 + 999,
        point.timestampMs > previous else { return false }
      previous = point.timestampMs
    }
    return true
  }
  enum CompletionError: Error { case distanceUnavailable, invalidTimeline }
  func completedData() throws -> Data {
    guard distanceMeasured == true else { throw CompletionError.distanceUnavailable }
    guard hasValidCompletedTimeline else { throw CompletionError.invalidTimeline }
    var object = try JSONSerialization.jsonObject(with: JSONEncoder().encode(self)) as? [String: Any] ?? [:]
    object.removeValue(forKey: "distanceMeasured")
    object.removeValue(forKey: "activeSeconds")
    object.removeValue(forKey: "activeSince")
    for key in ["segmentDistance", "segmentDuration", "segmentSamples", "lastHeartSampleTime", "lastCadenceSampleTime"] { object.removeValue(forKey: key) }
    object["gpsPoints"] = gpsPoints.map { point -> [String: Any] in
      ["latitude": point.latitude, "longitude": point.longitude, "timestampMs": point.timestampMs,
       "speed": point.speed, "altitude": point.altitude, "accuracy": point.accuracy.map { $0 as Any } ?? NSNull()]
    }
    return try JSONSerialization.data(withJSONObject: object)
  }
  mutating func pause(at now: Date) {
    if let since = activeSince { activeSeconds += max(0, now.timeIntervalSince(since)) }
    activeSince = nil
    durationSec = Int(activeSeconds)
  }
  func elapsed(at now: Date) -> Int { Int(activeSeconds + (activeSince.map { max(0, now.timeIntervalSince($0)) } ?? 0)) }
}

