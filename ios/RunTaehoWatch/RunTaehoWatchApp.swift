import SwiftUI

@main
struct RunTaehoWatchApp: App {
  @WKExtensionDelegateAdaptor(WatchAppDelegate.self) private var delegate
  @StateObject private var recorder = RunRecorder()
  var body: some Scene { WindowGroup { RunView().environmentObject(recorder) } }
}

struct RunView: View {
  @EnvironmentObject var recorder: RunRecorder
  // PRIMARY[500] and GREY[900], from src/shared/styles/colors.ts.
  private let primary = Color(red: 89 / 255, green: 236 / 255, blue: 58 / 255)
  private func duration(_ value: Int) -> String { String(format: "%02d:%02d:%02d", value / 3600, value / 60 % 60, value % 60) }
  var body: some View {
    ScrollView {
      VStack(spacing: 10) {
        Text("달려라 태호군").font(.headline)
        if let record = recorder.record {
          TimelineView(.periodic(from: .now, by: 1)) { context in
            let seconds = record.elapsed(at: context.date)
            Text(record.distanceMeasured == true ? String(format: "%.2f km", Double(record.distance) / 1000) : "-- km").font(.title2).foregroundStyle(primary)
            Text("러닝 시간").font(.caption).foregroundStyle(.secondary)
            Text(duration(seconds)).monospacedDigit()
            HStack {
              VStack { Text("심박"); Text(record.heartRate > 0 ? "\(record.heartRate)" : "--") }
              Spacer()
              VStack { Text("페이스"); Text(record.distance > 0 ? String(format: "%d'%02d\"", seconds * 1000 / record.distance / 60, seconds * 1000 / record.distance % 60) : "--") }
            }.font(.caption).monospacedDigit()
          }
          Button(record.activeSince == nil ? "계속 달리기" : "일시정지") { recorder.togglePause() }.tint(primary).disabled(!recorder.hasLiveSession || recorder.finishing)
          Button("종료") { recorder.finish() }.disabled(recorder.finishing)
        } else {
          Button("러닝 시작") { recorder.start() }.tint(primary).disabled(recorder.owner == nil)
          if recorder.owner == nil { Text("휴대폰에서 로그인하여 연결하세요.").font(.caption) }
          Text(recorder.lastServerSaved ? "서버 저장 완료" : "완료된 기록은 휴대폰 연결 후 서버 저장 대기 중입니다.").font(.caption).foregroundStyle(.secondary)
        }
        if let error = recorder.errorMessage { Text(error).font(.caption).foregroundStyle(.orange) }
      }
    }.background(Color(red: 32 / 255, green: 32 / 255, blue: 32 / 255))
  }
}
