import SwiftUI
import WatchKit

@main
struct RunTaehoWatchApp: App {
  @WKExtensionDelegateAdaptor(WatchAppDelegate.self) private var delegate
  @StateObject private var recorder = RunRecorder()
  var body: some Scene { WindowGroup { RunView().environmentObject(recorder) } }
}

// Native counterparts of PRIMARY[500]/GREY[900] in shared/styles/colors.ts,
// with the approved watch Figma text colors.
enum WatchPalette {
  static let primary = Color(red: 89 / 255, green: 236 / 255, blue: 58 / 255)
  static let background = Color(red: 32 / 255, green: 32 / 255, blue: 32 / 255)
  static let text = Color(red: 248 / 255, green: 248 / 255, blue: 248 / 255)
  static let secondary = Color(red: 180 / 255, green: 180 / 255, blue: 180 / 255)
}

struct RunView: View {
  @EnvironmentObject var recorder: RunRecorder
  @State private var settings = WatchDisplaySettings.load()
  @State private var highlighted: WatchMetricSlot?
  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: 6) {
          if let record = recorder.record {
            TimelineView(.periodic(from: .now, by: 1)) { context in
              WatchMetricGrid(settings: settings, values: recorder.metricValues(at: context.date), now: context.date, highlighted: highlighted) { slot in
                settings.cycle(slot)
                WKInterfaceDevice.current().play(.click)
                highlighted = slot
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { if highlighted == slot { highlighted = nil } }
              }
            }
            HStack(spacing: 6) {
              Button(record.activeSince == nil ? "계속 달리기" : "일시정지") { recorder.togglePause() }
                .tint(WatchPalette.primary)
                .disabled(!recorder.hasLiveSession || recorder.finishing)
              Button("종료") { recorder.finish() }.disabled(recorder.finishing)
            }.font(.system(size: 12, weight: .semibold)).frame(minHeight: 44)
            settingsLink
          } else {
            Text("야외 러닝").font(.system(size: 18, weight: .semibold)).padding(.vertical, 14)
            Button { recorder.start() } label: {
              Label("시작", systemImage: "play.fill").font(.system(size: 16, weight: .bold)).frame(maxWidth: .infinity, minHeight: 44)
            }.tint(WatchPalette.primary).disabled(recorder.owner == nil)
            settingsLink
            if recorder.owner == nil { Text("휴대폰에서 로그인하여 연결하세요.").font(.caption) }
            Text(recorder.lastServerSaved ? "서버 저장 완료" : "완료된 기록은 휴대폰 연결 후 서버 저장 대기 중입니다.")
              .font(.caption2).foregroundStyle(WatchPalette.secondary)
          }
          if let error = recorder.errorMessage { Text(error).font(.caption2).foregroundStyle(.orange) }
        }.padding(.horizontal, 2)
      }.foregroundStyle(WatchPalette.text).background(WatchPalette.background)
    }.onChange(of: settings) { value in value.save() }
  }
  private var settingsLink: some View {
    NavigationLink { WatchSettingsView(settings: $settings) } label: {
      Image(systemName: "gearshape.fill").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
    }.buttonStyle(.plain).accessibilityLabel("설정")
  }
}

struct WatchMetricGrid: View {
  let settings: WatchDisplaySettings
  let values: WatchMetricValues
  let now: Date
  var highlighted: WatchMetricSlot? = nil
  var preview = false
  let tapped: (WatchMetricSlot) -> Void
  var body: some View {
    VStack(spacing: 3) {
      cell(.top, size: preview ? 28 : 38)
      cell(.middle, size: preview ? 24 : 26)
      HStack(spacing: 3) { cell(.bottomLeft, size: 20); cell(.bottomRight, size: 20) }
    }
  }
  private func cell(_ slot: WatchMetricSlot, size: CGFloat) -> some View {
    let metric = settings.active(for: slot)
    let display = values.display(metric, unit: settings.unit, now: now)
    let selected = highlighted == slot
    return Button { tapped(slot) } label: {
      VStack(spacing: 1) {
        if slot == .top || metric == .currentPace || metric == .averagePace {
          Text(metric.label).font(.system(size: 11)).foregroundStyle(WatchPalette.secondary)
        }
        HStack(alignment: .firstTextBaseline, spacing: 2) {
          Text(display.value).font(.system(size: size, weight: .semibold, design: .rounded)).monospacedDigit()
            .minimumScaleFactor(0.55).lineLimit(1)
          if !display.unit.isEmpty { Text(display.unit).font(.system(size: 10)).lineLimit(1).minimumScaleFactor(0.7) }
        }.foregroundStyle(selected ? WatchPalette.primary : WatchPalette.text)
      }.frame(maxWidth: .infinity, minHeight: 44).padding(.vertical, 2)
        .background(selected ? WatchPalette.primary.opacity(0.12) : Color.clear)
        .contentShape(Rectangle())
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(preview || selected ? (selected ? WatchPalette.primary : WatchPalette.secondary.opacity(0.4)) : .clear, lineWidth: 1))
    }.buttonStyle(.plain)
      .accessibilityLabel("\(metric.label), \(display.value) \(display.unit)")
      .accessibilityHint(preview ? "전환할 지표 선택" : "다음 선택 지표로 전환")
      .animation(.easeOut(duration: 0.15), value: selected)
  }
}

struct WatchSettingsView: View {
  @Binding var settings: WatchDisplaySettings
  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        NavigationLink { WatchUnitSettingsView(settings: $settings) } label: {
          HStack { Text("단위"); Spacer(); Text(settings.unit.rawValue).foregroundStyle(WatchPalette.secondary); Image(systemName: "chevron.right") }
            .frame(minHeight: 44)
        }
        NavigationLink { WatchLayoutSettingsView(settings: $settings) } label: {
          HStack { Text("러닝 화면"); Spacer(); Image(systemName: "chevron.right") }.frame(minHeight: 44)
        }
      }.font(.system(size: 14))
    }.navigationTitle("설정").background(WatchPalette.background)
  }
}
struct WatchUnitSettingsView: View {
  @Binding var settings: WatchDisplaySettings
  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        ForEach(WatchDisplayUnit.allCases, id: \.self) { unit in
          Button { settings.unit = unit } label: {
            HStack {
              VStack(alignment: .leading, spacing: 4) {
                Text(unit.rawValue).font(.system(size: 15, weight: .semibold))
                Text("\(unit.distance) · \(unit.pace) · \(unit.speed)").font(.system(size: 10)).foregroundStyle(WatchPalette.secondary)
              }
              Spacer()
              if settings.unit == unit { Image(systemName: "checkmark").foregroundStyle(WatchPalette.primary) }
            }.frame(maxWidth: .infinity, minHeight: 44)
          }.tint(settings.unit == unit ? WatchPalette.primary : .gray)
            .accessibilityAddTraits(settings.unit == unit ? .isSelected : [])
        }
      }
    }.navigationTitle("단위").background(WatchPalette.background)
  }
}
struct WatchLayoutSettingsView: View {
  @Binding var settings: WatchDisplaySettings
  @State private var editing: WatchMetricSlot?
  // Illustrative settings preview, separate from the live recorder.
  private let now = Date(timeIntervalSince1970: 1000)
  var body: some View {
    ScrollView {
      WatchMetricGrid(settings: settings,
        values: WatchMetricValues(elapsed: 1404, distanceMeters: 2660, active: true,
          speed: WatchLiveSample(value: 3, timestamp: now), heartRate: WatchLiveSample(value: 148, timestamp: now),
          cadence: WatchLiveSample(value: 172, timestamp: now), calories: 284), now: now, preview: true) { editing = $0 }
        .accessibilityLabel("러닝 화면 미리보기")
    }.navigationTitle("러닝 화면").background(WatchPalette.background)
      .navigationDestination(isPresented: Binding(get: { editing != nil }, set: { if !$0 { editing = nil } })) {
        if let slot = editing { WatchMetricPicker(settings: $settings, slot: slot) }
      }
  }
}
struct WatchMetricPicker: View {
  @Binding var settings: WatchDisplaySettings
  let slot: WatchMetricSlot
  var body: some View {
    ScrollView {
      VStack(spacing: 6) {
        WatchSlotMap(selected: slot).frame(width: 32, height: 24).accessibilityHidden(true)
        Text("전환할 지표").font(.system(size: 16, weight: .semibold)).padding(.bottom, 4)
        ForEach(WatchMetric.allCases, id: \.self) { metric in
          let selected = settings.favorites(for: slot).contains(metric)
          let count = settings.favorites(for: slot).count
          Button { if settings.toggle(metric, in: slot) { WKInterfaceDevice.current().play(.click) } } label: {
            HStack {
              Text(metric.label).font(.system(size: 14))
              Spacer()
              Image(systemName: selected ? "checkmark.square.fill" : "square")
                .foregroundStyle(selected ? WatchPalette.primary : WatchPalette.secondary)
            }.frame(maxWidth: .infinity, minHeight: 44)
          }.tint(selected ? WatchPalette.primary : .gray)
            .disabled(selected ? count == 1 : count >= 3)
            .accessibilityLabel(metric.label)
            .accessibilityValue(selected ? "선택됨" : "선택 안 됨")
        }
      }.padding(.horizontal, 2)
    }.background(WatchPalette.background)
  }
}
struct WatchSlotMap: View {
  let selected: WatchMetricSlot
  var body: some View {
    VStack(spacing: 2) {
      block(.top)
      block(.middle)
      HStack(spacing: 2) { block(.bottomLeft); block(.bottomRight) }
    }
  }
  private func block(_ slot: WatchMetricSlot) -> some View {
    RoundedRectangle(cornerRadius: 1)
      .fill(selected == slot ? WatchPalette.primary : .clear)
      .overlay(RoundedRectangle(cornerRadius: 1).stroke(selected == slot ? WatchPalette.primary : WatchPalette.secondary, lineWidth: 1))
  }
}
