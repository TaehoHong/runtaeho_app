import Foundation

enum WatchMetric: String, CaseIterable, Codable {
  case distance, duration, currentPace, averagePace, heartRate, cadence, speed, calories
  var label: String {
    switch self {
    case .distance: return "거리"
    case .duration: return "시간"
    case .currentPace: return "현재 페이스"
    case .averagePace: return "평균 페이스"
    case .heartRate: return "심박"
    case .cadence: return "케이던스"
    case .speed: return "속도"
    case .calories: return "칼로리"
    }
  }
}
enum WatchMetricSlot: String, CaseIterable, Codable, Identifiable {
  case top, middle, bottomLeft, bottomRight
  var id: String { rawValue }
  var defaults: [WatchMetric] {
    switch self {
    case .top: return [.currentPace, .averagePace, .speed]
    case .middle: return [.duration, .distance]
    case .bottomLeft: return [.heartRate, .calories]
    case .bottomRight: return [.cadence, .averagePace]
    }
  }
}
enum WatchDisplayUnit: String, CaseIterable, Codable {
  case kph = "KPH", mph = "MPH"
  var metersPerDistance: Double { self == .kph ? 1000 : 1609.344 }
  var distance: String { self == .kph ? "km" : "mi" }
  var pace: String { self == .kph ? "min/km" : "min/mi" }
  var speed: String { self == .kph ? "km/h" : "mph" }
}

struct WatchDisplaySettings: Codable, Equatable {
  private struct Selection: Codable, Equatable { var favorites: [WatchMetric]; var active: WatchMetric }
  var unit = WatchDisplayUnit.kph
  private var slots: [String: Selection] = [:]
  init() {}
  private static let storageKey = "watchDisplaySettings.v1"
  func favorites(for slot: WatchMetricSlot) -> [WatchMetric] {
    let saved = slots[slot.rawValue]?.favorites ?? slot.defaults
    let ordered = WatchMetric.allCases.filter { saved.contains($0) }
    return ordered.isEmpty ? WatchMetric.allCases.filter { slot.defaults.contains($0) } : Array(ordered.prefix(3))
  }
  func active(for slot: WatchMetricSlot) -> WatchMetric {
    let selected = favorites(for: slot)
    let active = slots[slot.rawValue]?.active ?? slot.defaults[0]
    return selected.contains(active) ? active : selected[0]
  }
  mutating func cycle(_ slot: WatchMetricSlot) {
    let selected = favorites(for: slot)
    let index = selected.firstIndex(of: active(for: slot)) ?? 0
    slots[slot.rawValue] = Selection(favorites: selected, active: selected[(index + 1) % selected.count])
  }
  @discardableResult mutating func toggle(_ metric: WatchMetric, in slot: WatchMetricSlot) -> Bool {
    var selected = favorites(for: slot)
    let current = active(for: slot)
    if selected.contains(metric) {
      guard selected.count > 1 else { return false }
      selected.removeAll { $0 == metric }
    } else {
      guard selected.count < 3 else { return false }
      selected.append(metric)
    }
    selected = WatchMetric.allCases.filter { selected.contains($0) }
    slots[slot.rawValue] = Selection(favorites: selected, active: selected.contains(current) ? current : selected[0])
    return true
  }
  static func load(from defaults: UserDefaults = .standard) -> Self {
    guard let data = defaults.data(forKey: storageKey),
      let decoded = try? JSONDecoder().decode(Self.self, from: data) else { return Self() }
    // Accessors normalize duplicate/empty/oversized selections and invalid active values.
    return decoded
  }
  func save(to defaults: UserDefaults = .standard) {
    if let data = try? JSONEncoder().encode(self) { defaults.set(data, forKey: Self.storageKey) }
  }
}

struct WatchLiveSample {
  let value: Double
  let timestamp: Date
  static func cadence(stepsPerSecond: Double?, timestamp: Date) -> Self? {
    guard let value = stepsPerSecond, value.isFinite, value >= 0, (value * 60).isFinite else { return nil }
    return Self(value: value * 60, timestamp: timestamp)
  }
  func value(at now: Date) -> Double? {
    let age = now.timeIntervalSince(timestamp)
    return value.isFinite && value >= 0 && age >= 0 && age <= 30 ? value : nil
  }
}
struct WatchMetricValues {
  var elapsed: Int
  var distanceMeters: Double?
  var active: Bool
  var speed: WatchLiveSample?
  var heartRate: WatchLiveSample?
  var cadence: WatchLiveSample?
  var calories: Double?
  struct Display { let value: String; let unit: String }
  func display(_ metric: WatchMetric, unit: WatchDisplayUnit, now: Date) -> Display {
    func number(_ value: Double?, digits: Int = 0, suffix: String) -> Display {
      guard let value, value.isFinite, value >= 0 else { return Display(value: "--", unit: suffix) }
      return Display(value: String(format: "%.*f", digits, value), unit: suffix)
    }
    func pace(_ seconds: Double?) -> Display {
      guard let seconds, seconds.isFinite, seconds > 0, seconds <= Double(Int32.max) else { return Display(value: "--", unit: unit.pace) }
      let rounded = Int(seconds.rounded())
      return Display(value: String(format: "%d'%02d\"", rounded / 60, rounded % 60), unit: unit.pace)
    }
    let currentSpeed = active ? speed?.value(at: now) : nil
    switch metric {
    case .distance: return number(distanceMeters.map { $0 / unit.metersPerDistance }, digits: 2, suffix: unit.distance)
    case .duration:
      let seconds = max(0, elapsed)
      return Display(value: seconds >= 3600 ? String(format: "%d:%02d:%02d", seconds / 3600, seconds / 60 % 60, seconds % 60) : String(format: "%02d:%02d", seconds / 60, seconds % 60), unit: "")
    case .currentPace: return pace(currentSpeed.flatMap { $0 > 0 ? unit.metersPerDistance / $0 : nil })
    case .averagePace: return pace(distanceMeters.flatMap { $0 > 0 && elapsed > 0 ? Double(elapsed) * unit.metersPerDistance / $0 : nil })
    case .speed: return number(currentSpeed.map { $0 * 3600 / unit.metersPerDistance }, digits: 1, suffix: unit.speed)
    case .heartRate: return number(active ? heartRate?.value(at: now).flatMap { $0 > 0 ? $0 : nil } : nil, suffix: "bpm")
    case .cadence: return number(active ? cadence?.value(at: now) : nil, suffix: "spm")
    case .calories: return number(calories, suffix: "kcal")
    }
  }
}
