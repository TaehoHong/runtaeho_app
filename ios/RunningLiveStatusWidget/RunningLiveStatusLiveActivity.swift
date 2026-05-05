import ActivityKit
import SwiftUI
import WidgetKit

@available(iOS 17.0, *)
struct RunningLiveStatusLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RunningLiveStatusAttributes.self) { context in
      RunningLiveStatusContent(state: context.state)
        .activityBackgroundTint(Color.black)
        .activitySystemActionForegroundColor(Color.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text(formatDistance(context.state.distanceMeters))
            .font(.headline)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(formatElapsed(context.state.elapsedSec))
            .font(.headline)
        }
        DynamicIslandExpandedRegion(.bottom) {
          RunningLiveStatusActions(state: context.state.state)
        }
      } compactLeading: {
        Text(formatDistance(context.state.distanceMeters))
      } compactTrailing: {
        Text(formatPace(context.state.paceSecPerKm))
      } minimal: {
        Text("Run")
      }
    }
  }
}

@available(iOS 17.0, *)
private struct RunningLiveStatusContent: View {
  let state: RunningLiveStatusAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        Text(statusText(state.state))
          .font(.headline)
        Spacer()
        Text(formatElapsed(state.elapsedSec))
          .font(.system(.headline, design: .monospaced))
      }

      HStack(spacing: 18) {
        metric("거리", formatDistance(state.distanceMeters))
        metric("페이스", formatPace(state.paceSecPerKm))
      }

      RunningLiveStatusActions(state: state.state)
    }
    .padding(16)
  }

  private func metric(_ title: String, _ value: String) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(title)
        .font(.caption2)
        .foregroundStyle(.secondary)
      Text(value)
        .font(.system(.title3, design: .rounded).weight(.semibold))
    }
  }
}

@available(iOS 17.0, *)
private struct RunningLiveStatusActions: View {
  let state: String

  var body: some View {
    HStack(spacing: 12) {
      if state == "paused" {
        Button(intent: ResumeRunningIntent()) {
          Text("재개")
        }
      } else if state != "ending" {
        Button(intent: PauseRunningIntent()) {
          Text("일시정지")
        }
      }

      Button(intent: StopRunningIntent()) {
        Text("종료")
      }
      .tint(.red)
    }
  }
}

private func statusText(_ state: String) -> String {
  switch state {
  case "paused":
    return "일시정지"
  case "ending":
    return "종료 처리"
  default:
    return "진행 중"
  }
}

private func formatDistance(_ distanceMeters: Int) -> String {
  String(format: "%.2f km", Double(distanceMeters) / 1000.0)
}

private func formatElapsed(_ elapsedSec: Int) -> String {
  let hours = elapsedSec / 3600
  let minutes = (elapsedSec % 3600) / 60
  let seconds = elapsedSec % 60

  if hours > 0 {
    return String(format: "%d:%02d:%02d", hours, minutes, seconds)
  }
  return String(format: "%02d:%02d", minutes, seconds)
}

private func formatPace(_ paceSecPerKm: Int?) -> String {
  guard let paceSecPerKm else {
    return "--'--\""
  }
  return String(format: "%d'%02d\"", paceSecPerKm / 60, paceSecPerKm % 60)
}
