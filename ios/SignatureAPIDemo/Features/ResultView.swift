import SwiftUI

/// Screen 3: how the signing ended. `ending == nil` while the server confirms.
struct ResultView: View {
    let flow: SigningFlow
    let ending: SigningFlow.Ending?

    var body: some View {
        VStack(spacing: 14) {
            Spacer()
            badge
            Text(title)
                .font(.brand(28))
                .foregroundStyle(Theme.text)
                .multilineTextAlignment(.center)
                .accessibilityIdentifier("result-title")
            Text(message)
                .font(.inter(16))
                .foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 320)
            Spacer()
            actions
        }
        .padding(24)
        .frame(maxWidth: 520)
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder private var badge: some View {
        if ending == nil {
            ProgressView().controlSize(.large).frame(width: 72, height: 72)
        } else {
            Text(symbol)
                .font(.inter(30, weight: .semibold))
                .foregroundStyle(tone.foreground)
                .frame(width: 72, height: 72)
                .background(tone.background, in: Circle())
                .accessibilityHidden(true)
        }
    }

    @ViewBuilder private var actions: some View {
        VStack(spacing: 8) {
            switch ending {
            case .signed:
                Button("Done") { flow.backToStart() }.buttonStyle(.primary)
            case .canceled:
                Button("Try again") { Task { await flow.start() } }.buttonStyle(.primary)
                Button("Back to start") { flow.backToStart() }.buttonStyle(.plainAction)
            case .couldNotOpen:
                Button("Start again") { Task { await flow.start() } }.buttonStyle(.primary)
            case .notConfirmed:
                Button("Back to start") { flow.backToStart() }.buttonStyle(.primary)
            case nil:
                EmptyView()
            }
        }
    }

    private var title: String {
        switch ending {
        case .signed: "Document signed"
        case .canceled: "Signing canceled"
        case .couldNotOpen: "Couldn’t open the document"
        case .notConfirmed: "Signature not confirmed yet"
        case nil: "Confirming signature…"
        }
    }

    private var message: String {
        switch ending {
        case .signed: "SignatureAPI confirmed the signature. The signed PDF is ready."
        case .canceled: "Nothing was signed. You can start again whenever you like."
        case .couldNotOpen(let reason), .notConfirmed(let reason): reason
        case nil: "Checking with SignatureAPI."
        }
    }

    private var symbol: String {
        switch ending {
        case .signed: "✓"
        case .canceled: "✕"
        default: "!"
        }
    }

    private var tone: (foreground: Color, background: Color) {
        switch ending {
        case .signed: (Theme.success, Theme.successSoft)
        case .canceled: (Theme.textSecondary, Theme.hover)
        case .notConfirmed: (Theme.warning, Theme.warningSoft)
        default: (Theme.danger, Theme.dangerSoft)
        }
    }
}
