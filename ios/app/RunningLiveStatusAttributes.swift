import ActivityKit
import Foundation

public struct RunningLiveStatusAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var state: String
    public var distanceMeters: Int
    public var elapsedSec: Int
    public var paceSecPerKm: Int?
    public var updatedAtMs: Int

    public init(
      state: String,
      distanceMeters: Int,
      elapsedSec: Int,
      paceSecPerKm: Int?,
      updatedAtMs: Int
    ) {
      self.state = state
      self.distanceMeters = distanceMeters
      self.elapsedSec = elapsedSec
      self.paceSecPerKm = paceSecPerKm
      self.updatedAtMs = updatedAtMs
    }
  }

  public var recordId: Int

  public init(recordId: Int) {
    self.recordId = recordId
  }
}
