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
  var activeSince: Date?
  var activeSeconds: Double = 0
  struct Point: Codable {
    var latitude: Double; var longitude: Double; var timestampMs: Int64
    var speed: Double; var altitude: Double; var accuracy: Double?
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

