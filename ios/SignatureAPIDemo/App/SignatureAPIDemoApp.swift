import SwiftUI

@main
struct SignatureAPIDemoApp: App {
    init() {
        Appearance.apply()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .tint(Theme.accent)
        }
    }
}
