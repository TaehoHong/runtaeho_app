import Foundation

@main
struct WatchDisplaySettingsTests {
  static func main() throws {
    defaultsAndIndependentCycling()
    selectionBoundsAndActivePreservation()
    try persistenceAndMalformedSettings()
    conversionsAndUnavailableMetrics()
    try displayPreferencesDoNotChangeRecordedWire()
    print("WatchDisplaySettingsTests: cycling, favorites, persistence, conversion, freshness and SI wire invariants passed")
  }
  static func defaultsAndIndependentCycling() {
    var settings = WatchDisplaySettings()
    assert(settings.unit == .kph)
    assert(settings.active(for: .top) == .currentPace)
    assert(settings.active(for: .middle) == .duration)
    assert(settings.active(for: .bottomLeft) == .heartRate)
    assert(settings.active(for: .bottomRight) == .cadence)
    settings.cycle(.top)
    assert(settings.active(for: .top) == .averagePace)
    assert(settings.active(for: .middle) == .duration)
    settings.cycle(.top)
    assert(settings.active(for: .top) == .speed)
    settings.cycle(.top)
    assert(settings.active(for: .top) == .currentPace)
    settings.cycle(.bottomRight)
    assert(settings.active(for: .bottomRight) == .averagePace)
    settings.cycle(.bottomRight)
    assert(settings.active(for: .bottomRight) == .cadence)
  }
  static func selectionBoundsAndActivePreservation() {
    var settings = WatchDisplaySettings()
    assert(!settings.toggle(.distance, in: .top)) // already three favorites
    assert(settings.toggle(.speed, in: .top))
    assert(settings.active(for: .top) == .currentPace)
    assert(settings.toggle(.currentPace, in: .top))
    assert(settings.active(for: .top) == .averagePace)
    assert(!settings.toggle(.averagePace, in: .top)) // cannot clear last
    assert(settings.toggle(.distance, in: .top))
    assert(settings.toggle(.heartRate, in: .top))
    assert(settings.favorites(for: .top) == [.distance, .averagePace, .heartRate])
    assert(settings.active(for: .top) == .averagePace)
    settings.cycle(.top)
    assert(settings.active(for: .top) == .heartRate)
    settings.cycle(.top)
    assert(settings.active(for: .top) == .distance)
  }
  static func persistenceAndMalformedSettings() throws {
    let suite = "watch-display-tests-\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suite)!
    defer { defaults.removePersistentDomain(forName: suite) }
    var settings = WatchDisplaySettings()
    settings.unit = .mph
    settings.cycle(.top)
    _ = settings.toggle(.distance, in: .middle)
    settings.save(to: defaults)
    let restored = WatchDisplaySettings.load(from: defaults)
    assert(restored.unit == .mph)
    assert(restored.active(for: .top) == .averagePace)
    assert(restored.favorites(for: .middle) == [.duration])
    defaults.set(Data("broken".utf8), forKey: "watchDisplaySettings.v1")
    assert(WatchDisplaySettings.load(from: defaults).active(for: .bottomRight) == .cadence)
    let malformed = """
    {"unit":"kph","slots":{}}
    """
    defaults.set(Data(malformed.utf8), forKey: "watchDisplaySettings.v1")
    assert(WatchDisplaySettings.load(from: defaults).unit == .kph)
    let invalidSelections = """
    {"unit":"MPH","slots":{"top":{"favorites":["distance","distance","duration","speed","heartRate"],"active":"calories"},"middle":{"favorites":[],"active":"speed"}}}
    """
    defaults.set(Data(invalidSelections.utf8), forKey: "watchDisplaySettings.v1")
    let normalized = WatchDisplaySettings.load(from: defaults)
    assert(normalized.favorites(for: .top) == [.distance, .duration, .heartRate])
    assert(normalized.active(for: .top) == .distance)
    assert(normalized.favorites(for: .middle) == [.distance, .duration])
    let unknown = """
    {"unit":"MPH","slots":{"top":{"favorites":["not-a-metric"],"active":"speed"}}}
    """
    defaults.set(Data(unknown.utf8), forKey: "watchDisplaySettings.v1")
    assert(WatchDisplaySettings.load(from: defaults).active(for: .top) == .currentPace)
  }
  static func conversionsAndUnavailableMetrics() {
    let now = Date(timeIntervalSince1970: 1000)
    var values = WatchMetricValues(elapsed: 600, distanceMeters: 1609.344, active: true,
      speed: WatchLiveSample(value: 4, timestamp: now), heartRate: WatchLiveSample(value: 148, timestamp: now),
      cadence: WatchLiveSample.cadence(stepsPerSecond: 2.5, timestamp: now), calories: 284)
    assert(values.display(.distance, unit: .mph, now: now).value == "1.00")
    assert(values.display(.distance, unit: .kph, now: now).value == "1.61")
    assert(values.display(.speed, unit: .kph, now: now).value == "14.4")
    assert(values.display(.speed, unit: .mph, now: now).value == "8.9")
    assert(values.display(.currentPace, unit: .kph, now: now).value == "4'10\"")
    assert(values.display(.currentPace, unit: .mph, now: now).value == "6'42\"")
    assert(values.display(.averagePace, unit: .mph, now: now).value == "10'00\"")
    assert(values.display(.duration, unit: .kph, now: now).value == "10:00")
    assert(values.display(.cadence, unit: .kph, now: now).value == "150")
    assert(values.display(.heartRate, unit: .mph, now: now).value == "148")
    assert(values.display(.speed, unit: .kph, now: now.addingTimeInterval(30)).value == "14.4")
    assert(values.display(.speed, unit: .kph, now: now.addingTimeInterval(31)).value == "--")
    assert(values.display(.speed, unit: .kph, now: now.addingTimeInterval(-1)).value == "--")
    values.active = false
    assert(values.display(.speed, unit: .kph, now: now).value == "--")
    assert(values.display(.currentPace, unit: .kph, now: now).value == "--")
    assert(values.display(.cadence, unit: .kph, now: now).value == "--")
    assert(values.display(.averagePace, unit: .mph, now: now).value == "10'00\"")
    values.active = true
    values.speed = WatchLiveSample(value: 0, timestamp: now)
    values.cadence = WatchLiveSample.cadence(stepsPerSecond: 0, timestamp: now)
    assert(values.display(.speed, unit: .kph, now: now).value == "0.0")
    assert(values.display(.currentPace, unit: .kph, now: now).value == "--")
    assert(values.display(.cadence, unit: .kph, now: now).value == "0")
    values.speed = WatchLiveSample(value: .infinity, timestamp: now)
    values.heartRate = WatchLiveSample(value: 0, timestamp: now)
    values.distanceMeters = .nan
    values.calories = nil
    assert(values.display(.speed, unit: .mph, now: now).value == "--")
    assert(values.display(.heartRate, unit: .kph, now: now).value == "--")
    assert(values.display(.distance, unit: .mph, now: now).value == "--")
    assert(values.display(.averagePace, unit: .mph, now: now).value == "--")
    assert(values.display(.calories, unit: .kph, now: now).value == "--")
    assert(WatchLiveSample.cadence(stepsPerSecond: nil, timestamp: now) == nil)
    assert(WatchLiveSample.cadence(stepsPerSecond: -1, timestamp: now) == nil)
    values.elapsed = 3601
    assert(values.display(.duration, unit: .mph, now: now).value == "1:00:01")
  }
  static func displayPreferencesDoNotChangeRecordedWire() throws {
    let legacy = """
    {"schemaVersion":1,"sessionId":"b4008e58-e49c-4cae-8fac-590b0582e7d4","ownerUserId":7,"source":"APPLE_WATCH","startTimestamp":1000,"endTimestamp":1600,"distance":1609,"distanceMeasured":true,"durationSec":600,"cadence":170,"heartRate":140,"calorie":284,"gpsPoints":[],"activeSeconds":600}
    """
    let record = try JSONDecoder().decode(RunCheckpoint.self, from: Data(legacy.utf8))
    let before = try JSONSerialization.jsonObject(with: record.completedData()) as! NSDictionary
    var settings = WatchDisplaySettings()
    settings.unit = .mph
    settings.cycle(.top)
    let values = WatchMetricValues(elapsed: record.durationSec, distanceMeters: Double(record.distance), active: false, calories: Double(record.calorie))
    assert(values.display(.distance, unit: settings.unit, now: Date()).value == "1.00")
    let after = try JSONSerialization.jsonObject(with: record.completedData()) as! NSDictionary
    assert(before == after)
    assert(after["distance"] as? Int == 1609 && after["durationSec"] as? Int == 600)
    assert(after["heartRate"] as? Int == 140 && after["cadence"] as? Int == 170)
  }
}
