import SwiftUI

/// Screen 2: the ceremony, full screen, under a thin native bar the app owns.
struct CeremonyScreen: View {
    let ceremony: SigningFlow.Ceremony
    let flow: SigningFlow

    var body: some View {
        NavigationStack {
            CeremonyWebView(ceremonyURL: ceremony.url) { event in
                Task { await flow.ceremonyEnded(with: event, envelopeId: ceremony.envelopeId) }
            }
            .ignoresSafeArea(.container, edges: .bottom)
            .navigationTitle("Sign document")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { flow.closeCeremony() }
                        .font(.inter(16, weight: .medium))
                }
            }
        }
        .interactiveDismissDisabled()
    }
}
