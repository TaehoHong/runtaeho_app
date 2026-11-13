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
    var completed = self
    try completed.alignSegmentSeconds()
    guard completed.hasValidCompletedTimeline else { throw CompletionError.invalidTimeline }
    var object = try JSONSerialization.jsonObject(with: JSONEncoder().encode(completed)) as? [String: Any] ?? [:]
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
  private mutating func alignSegmentSeconds() throws {
    guard let original = items, !original.isEmpty, !hasValidCompletedTimeline else { return }
    guard endTimestamp >= startTimestamp, durationSec >= 0, durationSec <= endTimestamp - startTimestamp,
      original.allSatisfy({ $0.durationSec >= 0 }),
      original.reduce(0, { $0 + $1.durationSec }) == durationSec else { throw CompletionError.invalidTimeline }

    // Activity totals and epoch boundaries truncate independently. Move only
    // internal boundaries by up to one second to accommodate the rounding carry.
    var aligned = original
    var remaining = durationSec
    var previousEnd = startTimestamp
    var previousOriginalEnd = startTimestamp
    for (index, segment) in original.enumerated() {
      guard segment.startTimestamp >= previousOriginalEnd, segment.endTimestamp >= segment.startTimestamp,
        segment.endTimestamp <= endTimestamp else { throw CompletionError.invalidTimeline }
      let contiguous = segment.startTimestamp == previousOriginalEnd
      remaining -= segment.durationSec
      let latestEnd = endTimestamp - remaining
      let start = contiguous ? previousEnd : min(max(segment.startTimestamp, previousEnd), latestEnd - segment.durationSec)
      let end = min(max(segment.endTimestamp, start + segment.durationSec), latestEnd)
      guard abs(start - segment.startTimestamp) <= 1, abs(end - segment.endTimestamp) <= 1 else {
        throw CompletionError.invalidTimeline
      }
      aligned[index].startTimestamp = start
      aligned[index].endTimestamp = end
      previousEnd = end
      previousOriginalEnd = segment.endTimestamp
    }
    items = aligned
  }
  mutating func pause(at now: Date) {
    if let since = activeSince { activeSeconds += max(0, now.timeIntervalSince(since)) }
    activeSince = nil
    durationSec = Int(activeSeconds)
  }
  func elapsed(at now: Date) -> Int { Int(activeSeconds + (activeSince.map { max(0, now.timeIntervalSince($0)) } ?? 0)) }
}

