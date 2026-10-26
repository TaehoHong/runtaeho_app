import Foundation

@main
struct RunCheckpointTests {
  static func main() throws {
    let start = Date(timeIntervalSince1970: 1000)
    var run = RunCheckpoint(ownerUserId: 7, startTimestamp: 1000, activeSince: start)
    assert(run.elapsed(at: start.addingTimeInterval(10)) == 10)
    run.pause(at: start.addingTimeInterval(10))
    assert(run.elapsed(at: start.addingTimeInterval(100)) == 10)
    run.activeSince = start.addingTimeInterval(100)
    run.pause(at: start.addingTimeInterval(105))
    assert(run.durationSec == 15)
    do {
      _ = try run.completedData()
      assertionFailure("Missing distance must not produce an upload payload")
    } catch RunCheckpoint.CompletionError.distanceUnavailable {}
    let unmeasured = try JSONDecoder().decode(RunCheckpoint.self, from: JSONEncoder().encode(run))
    assert(unmeasured.distanceMeasured == nil)
    do {
      _ = try unmeasured.completedData()
      assertionFailure("Restored missing distance must remain ineligible")
    } catch RunCheckpoint.CompletionError.distanceUnavailable {}
    run.endTimestamp = 1015
    run.distanceMeasured = true
    var invalid = run
    invalid.endTimestamp = 999
    assert(!invalid.hasValidCompletedTimeline)
    do { _ = try invalid.completedData(); assertionFailure("Clock rollback must not enter upload queue") }
    catch RunCheckpoint.CompletionError.invalidTimeline {}
    invalid = run
    invalid.durationSec = 16
    assert(!invalid.hasValidCompletedTimeline)
    invalid = run
    invalid.gpsPoints = [.init(latitude: 37, longitude: 127, timestampMs: 1016000, speed: 1, altitude: 2, accuracy: 5)]
    assert(!invalid.hasValidCompletedTimeline)
    invalid.gpsPoints = [.init(latitude: 37, longitude: 127, timestampMs: 1002000, speed: 1, altitude: 2, accuracy: 5), .init(latitude: 37, longitude: 127, timestampMs: 1001000, speed: 1, altitude: 2, accuracy: 5)]
    assert(!invalid.hasValidCompletedTimeline)
    assert(run.hasValidCompletedTimeline)
    let measuredZero = try JSONSerialization.jsonObject(with: run.completedData()) as! [String: Any]
    assert(measuredZero["distance"] as? Int == 0)
    run.gpsPoints = [.init(latitude: 37, longitude: 127, timestampMs: 1000000, speed: 1, altitude: 2, accuracy: nil)]
    assert(!run.accepts(.init(latitude: 37, longitude: 127, timestampMs: 999000, speed: 1, altitude: 2, accuracy: 5), nowMs: 1100000))
    assert(!run.accepts(run.gpsPoints[0], nowMs: 1100000))
    assert(!run.accepts(.init(latitude: .nan, longitude: 127, timestampMs: 1001000, speed: 1, altitude: 2, accuracy: 5), nowMs: 1100000))
    assert(!run.accepts(.init(latitude: 37, longitude: 127, timestampMs: 1200000, speed: 1, altitude: 2, accuracy: 5), nowMs: 1100000))
    assert(run.accepts(.init(latitude: 37, longitude: 127, timestampMs: 1001000, speed: 1, altitude: 2, accuracy: 5), nowMs: 1100000))
    let wire = try JSONSerialization.jsonObject(with: run.completedData()) as! [String: Any]
    assert(Set(wire.keys) == Set(["schemaVersion", "sessionId", "ownerUserId", "source", "startTimestamp", "endTimestamp", "distance", "durationSec", "cadence", "heartRate", "calorie", "gpsPoints"]))
    let points = wire["gpsPoints"] as! [[String: Any]]
    assert(points[0]["accuracy"] is NSNull)
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let file = directory.appendingPathComponent("checkpoint.json")
    try JSONEncoder().encode(run).write(to: file, options: .atomic)
    let restored = try JSONDecoder().decode(RunCheckpoint.self, from: Data(contentsOf: file))
    assert(restored.sessionId == run.sessionId && restored.ownerUserId == 7)
    assert(restored.elapsed(at: start.addingTimeInterval(10000)) == 15)
    assert(restored.activeSince == nil)
    print("RunCheckpointTests: pause/resume timing, durable UUID/owner and paused recovery passed")
  }
}
