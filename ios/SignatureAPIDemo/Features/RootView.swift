import SwiftUI

struct RootView: View {
    @State private var flow = SigningFlow()

    var body: some View {
        Group {
            switch flow.phase {
            case .ready, .preparing, .signing:
                StartView(flow: flow)
            case .confirming:
                ResultView(flow: flow, ending: nil)
            case .finished(let ending):
                ResultView(flow: flow, ending: ending)
            }
        }
        .background(Theme.background)
        // No cross-fade between phases: the ceremony's own slide-down is the
        // transition, and fading text over text reads as a glitch.
        .fullScreenCover(item: .constant(flow.ceremony)) { ceremony in
            CeremonyScreen(ceremony: ceremony, flow: flow)
        }
    }
}
