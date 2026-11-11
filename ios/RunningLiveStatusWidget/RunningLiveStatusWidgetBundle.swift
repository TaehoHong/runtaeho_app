import SwiftUI
import WidgetKit

@main
@available(iOS 17.0, *)
struct RunningLiveStatusWidgetBundle: WidgetBundle {
  var body: some Widget {
    RunningLiveStatusLiveActivity()
  }
}
